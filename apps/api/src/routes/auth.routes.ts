import { Router } from "express";
import { prisma } from "@dan1/database";
import { loginSchema, impersonateSchema } from "@dan1/shared";
import { env, isProduction } from "../config/env.js";
import { authenticate } from "../middleware/auth.js";
import { login, logout, startImpersonation, endImpersonation } from "../services/auth.service.js";
import { recordAuditLog } from "../services/audit.service.js";
import { sendData, sendNoContent } from "../lib/response.js";
import type { RequestContext } from "../types/context.js";
import type { AuthUser } from "@dan1/shared";

export const authRouter = Router();

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

async function buildAuthUser(ctx: RequestContext): Promise<AuthUser> {
  if (ctx.userType === "internal") {
    let customerName: string | undefined;
    if (ctx.impersonatingCustomerId) {
      const customer = await prisma.customer.findUnique({ where: { id: ctx.impersonatingCustomerId } });
      customerName = customer?.name;
    }
    return {
      id: ctx.userId!.toString(),
      name: ctx.name,
      type: "internal",
      role: ctx.roleCode,
      customerId: ctx.impersonatingCustomerId?.toString(),
      customerName,
      impersonating: Boolean(ctx.impersonatingCustomerId),
    };
  }

  const customer = await prisma.customer.findUnique({ where: { id: ctx.customerId! } });
  return {
    id: ctx.customerUserId!.toString(),
    name: ctx.name,
    type: "facility",
    role: ctx.roleCode,
    customerId: ctx.customerId!.toString(),
    customerName: customer?.name,
  };
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await login(input, { ipAddress: req.ip, userAgent: req.get("user-agent") ?? undefined });
    res.cookie(env.sessionCookieName, result.token, cookieOptions(result.expiresAt));
    await recordAuditLog({
      ctx: result.context,
      action: "login",
      entityType: "session",
      entityId: result.context.sessionId,
    });
    const user = await buildAuthUser(result.context);
    sendData(res, user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", authenticate, async (req, res, next) => {
  try {
    const token = req.cookies?.[env.sessionCookieName];
    await recordAuditLog({ ctx: req.context!, action: "logout", entityType: "session", entityId: req.context!.sessionId });
    if (token) await logout(token);
    res.clearCookie(env.sessionCookieName, { path: "/" });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await buildAuthUser(req.context!);
    sendData(res, user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/impersonate", authenticate, async (req, res, next) => {
  try {
    const input = impersonateSchema.parse(req.body);
    const customerId = BigInt(input.customerId);
    await startImpersonation(req.context!, customerId);
    await recordAuditLog({
      ctx: { ...req.context!, impersonatingCustomerId: customerId },
      action: "impersonate",
      entityType: "customer",
      entityId: customerId,
      after: { started: true },
    });
    const refreshedCtx: RequestContext = { ...req.context!, impersonatingCustomerId: customerId };
    const user = await buildAuthUser(refreshedCtx);
    sendData(res, user);
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/impersonate", authenticate, async (req, res, next) => {
  try {
    const endedLog = await endImpersonation(req.context!);
    if (endedLog) {
      await recordAuditLog({
        ctx: req.context!,
        action: "impersonate",
        entityType: "customer",
        entityId: endedLog.customerId,
        after: { ended: true },
      });
    }
    const user = await buildAuthUser({ ...req.context!, impersonatingCustomerId: undefined });
    sendData(res, user);
  } catch (error) {
    next(error);
  }
});
