import { Router } from "express";
import {
  loginSchema,
  impersonateSchema,
  passwordChangeSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from "@dan1/shared";
import { env, isProduction } from "../config/env.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  login,
  logout,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
  startImpersonation,
  endImpersonation,
  getAuthUserProfile,
} from "../services/auth.service.js";
import { recordAuditLog } from "../services/audit.service.js";
import { sendData, sendMessage, sendNoContent } from "../lib/response.js";
import type { RequestContext } from "../types/context.js";

export const authRouter = Router();

const loginRateLimit = rateLimit({
  windowMs: 60_000,
  max: 15,
  keyFn: (req) => req.ip ?? "unknown",
});

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

authRouter.post("/login", loginRateLimit, async (req, res, next) => {
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
    const user = await getAuthUserProfile(result.context);
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
    const user = await getAuthUserProfile(req.context!);
    sendData(res, user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password/change", authenticate, async (req, res, next) => {
  try {
    const input = passwordChangeSchema.parse(req.body);
    await changePassword(req.context!, input);
    await recordAuditLog({
      ctx: req.context!,
      action: "update",
      entityType: "user",
      entityId: req.context!.userId ?? req.context!.customerUserId!,
      after: { passwordChanged: true },
    });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password-reset/request", loginRateLimit, async (req, res, next) => {
  try {
    const input = passwordResetRequestSchema.parse(req.body);
    await requestPasswordReset(input.loginId);
    sendMessage(res, "登録されているメールアドレスがある場合、再設定手順を送信しました");
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password-reset/confirm", async (req, res, next) => {
  try {
    const input = passwordResetConfirmSchema.parse(req.body);
    await confirmPasswordReset(input.token, input.newPassword);
    sendMessage(res, "パスワードを再設定しました。新しいパスワードでログインしてください");
  } catch (error) {
    next(error);
  }
});

authRouter.post("/impersonate", authenticate, authorize("admin.impersonate"), async (req, res, next) => {
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
    const user = await getAuthUserProfile(refreshedCtx);
    sendData(res, user);
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/impersonate", authenticate, authorize("admin.impersonate"), async (req, res, next) => {
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
    const user = await getAuthUserProfile({ ...req.context!, impersonatingCustomerId: undefined });
    sendData(res, user);
  } catch (error) {
    next(error);
  }
});
