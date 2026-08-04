import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@dan1/database";
import { verifyPassword } from "../lib/password.js";
import { UnauthenticatedError, ForbiddenError, BusinessRuleViolationError } from "../lib/errors.js";
import { expandPermissions } from "../lib/permissions.js";
import type { RequestContext } from "../types/context.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const INTERNAL_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const FACILITY_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type LoginType = "employee" | "haccp" | "facility";

export type LoginInput = {
  loginId: string;
  password: string;
  loginType: LoginType;
};

export type SessionMeta = {
  ipAddress?: string;
  userAgent?: string;
};

export type LoginResult = {
  token: string;
  expiresAt: Date;
  context: RequestContext;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function assertNotLocked(lockedUntil: Date | null): void {
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    throw new BusinessRuleViolationError(
      `ログインがロックされています。あと約${remainingMinutes}分でロックが解除されます`,
    );
  }
}

async function buildInternalContext(userId: bigint): Promise<RequestContext> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
      supplierScopes: true,
    },
  });
  const permissions = expandPermissions(
    user.role.code,
    user.role.rolePermissions.map((rp) => rp.permission.code),
  );
  const activeImpersonation = await prisma.impersonationLog.findFirst({
    where: { impersonatorId: userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  return {
    sessionId: 0n,
    userType: "internal",
    userId: user.id,
    name: user.name,
    roleCode: user.role.code,
    permissions,
    supplierScopeIds: user.supplierScopes.map((s) => s.supplierId),
    impersonatingCustomerId: activeImpersonation?.customerId,
    impersonatorId: activeImpersonation ? userId : undefined,
  };
}

async function buildFacilityContext(customerUserId: bigint): Promise<RequestContext> {
  const customerUser = await prisma.customerUser.findUniqueOrThrow({
    where: { id: customerUserId },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
      customer: true,
    },
  });
  const permissions = expandPermissions(
    customerUser.role.code,
    customerUser.role.rolePermissions.map((rp) => rp.permission.code),
  );
  return {
    sessionId: 0n,
    userType: "facility",
    customerUserId: customerUser.id,
    customerId: customerUser.customerId,
    name: customerUser.name,
    roleCode: customerUser.role.code,
    permissions,
  };
}

export async function loginInternal(input: LoginInput, meta: SessionMeta): Promise<LoginResult> {
  const where = input.loginType === "haccp" ? { haccpNo: input.loginId } : { employeeNo: input.loginId };
  const user = await prisma.user.findFirst({ where: { ...where, deletedAt: null } });
  if (!user || !user.isActive) throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");

  assertNotLocked(user.lockedUntil);

  const valid = verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : user.lockedUntil;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil } });
    throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INTERNAL_SESSION_TTL_MS);
  const session = await prisma.session.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt },
  });

  const context = await buildInternalContext(user.id);
  context.sessionId = session.id;
  context.ipAddress = meta.ipAddress;
  context.userAgent = meta.userAgent;
  return { token, expiresAt, context };
}

export async function loginFacility(input: LoginInput, meta: SessionMeta): Promise<LoginResult> {
  const customerUser = await prisma.customerUser.findFirst({
    where: { loginId: input.loginId, deletedAt: null },
  });
  if (!customerUser || !customerUser.isActive) {
    throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");
  }

  assertNotLocked(customerUser.lockedUntil);

  const valid = verifyPassword(input.password, customerUser.passwordHash);
  if (!valid) {
    const failedLoginCount = customerUser.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : customerUser.lockedUntil;
    await prisma.customerUser.update({ where: { id: customerUser.id }, data: { failedLoginCount, lockedUntil } });
    throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");
  }

  await prisma.customerUser.update({
    where: { id: customerUser.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + FACILITY_SESSION_TTL_MS);
  const session = await prisma.session.create({
    data: { tokenHash: hashToken(token), customerUserId: customerUser.id, expiresAt },
  });

  const context = await buildFacilityContext(customerUser.id);
  context.sessionId = session.id;
  context.ipAddress = meta.ipAddress;
  context.userAgent = meta.userAgent;
  return { token, expiresAt, context };
}

export async function login(input: LoginInput, meta: SessionMeta): Promise<LoginResult> {
  return input.loginType === "facility" ? loginFacility(input, meta) : loginInternal(input, meta);
}

export async function logout(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function getSessionContext(token: string): Promise<RequestContext | null> {
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const context = session.userId
    ? await buildInternalContext(session.userId)
    : session.customerUserId
      ? await buildFacilityContext(session.customerUserId)
      : null;
  if (!context) return null;
  context.sessionId = session.id;
  return context;
}

export async function startImpersonation(ctx: RequestContext, customerId: bigint) {
  if (ctx.userType !== "internal" || !ctx.userId) {
    throw new ForbiddenError("社内ユーザーのみ成り代わりを開始できます");
  }
  if (ctx.impersonatingCustomerId) {
    throw new BusinessRuleViolationError("既に成り代わり中です。先に終了してください");
  }
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.deletedAt) {
    throw new BusinessRuleViolationError("指定された施設が見つかりません");
  }
  const log = await prisma.impersonationLog.create({
    data: { impersonatorId: ctx.userId, customerId },
  });
  return log;
}

export async function endImpersonation(ctx: RequestContext) {
  if (ctx.userType !== "internal" || !ctx.userId) {
    throw new ForbiddenError("社内ユーザーのみ成り代わりを終了できます");
  }
  const log = await prisma.impersonationLog.findFirst({
    where: { impersonatorId: ctx.userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!log) return null;
  return prisma.impersonationLog.update({ where: { id: log.id }, data: { endedAt: new Date() } });
}
