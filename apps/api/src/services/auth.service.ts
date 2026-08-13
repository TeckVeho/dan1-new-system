import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@dan1/database";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { validatePassword } from "../lib/password-policy.js";
import { UnauthenticatedError, ForbiddenError, BusinessRuleViolationError, NotFoundError } from "../lib/errors.js";
import { expandPermissions } from "../lib/permissions.js";
import { getRoleDisplayName } from "@dan1/shared";
import type { RequestContext } from "../types/context.js";
import { env } from "../config/env.js";
import { sendEmail } from "./email.service.js";

const INTERNAL_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const FACILITY_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type LoginInput = {
  loginId: string;
  password: string;
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

export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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

async function findInternalUser(loginId: string) {
  if (loginId.includes("@")) {
    return prisma.user.findFirst({ where: { email: loginId, deletedAt: null } });
  }
  return prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ employeeNo: loginId }, { haccpNo: loginId }],
    },
  });
}

async function revokeOtherSessions(
  userId?: bigint,
  customerUserId?: bigint,
  exceptSessionId?: bigint,
): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(customerUserId ? { customerUserId } : {}),
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
  });
}

async function authenticateInternalUser(
  user: { id: bigint; isActive: boolean; passwordHash: string },
  password: string,
  meta: SessionMeta,
): Promise<LoginResult> {
  if (!user.isActive) throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
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

async function authenticateFacilityUser(
  customerUser: { id: bigint; isActive: boolean; passwordHash: string },
  password: string,
  meta: SessionMeta,
): Promise<LoginResult> {
  if (!customerUser.isActive) {
    throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");
  }

  const valid = verifyPassword(password, customerUser.passwordHash);
  if (!valid) {
    throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");
  }

  await prisma.customerUser.update({
    where: { id: customerUser.id },
    data: { lastLoginAt: new Date() },
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
  const internalUser = await findInternalUser(input.loginId);
  if (internalUser) {
    return authenticateInternalUser(internalUser, input.password, meta);
  }

  const facilityUser = await prisma.customerUser.findFirst({
    where: { loginId: input.loginId, deletedAt: null },
  });
  if (facilityUser) {
    return authenticateFacilityUser(facilityUser, input.password, meta);
  }

  throw new UnauthenticatedError("ログインIDまたはパスワードが正しくありません");
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

export async function changePassword(ctx: RequestContext, input: PasswordChangeInput): Promise<void> {
  if (ctx.userType === "internal" && ctx.userId) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    if (!verifyPassword(input.currentPassword, user.passwordHash)) {
      throw new UnauthenticatedError("現在のパスワードが正しくありません");
    }
    validatePassword(input.newPassword, { loginId: user.employeeNo, name: user.name });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(input.newPassword), passwordChangedAt: new Date() },
    });
    await revokeOtherSessions(user.id, undefined, ctx.sessionId);
    return;
  }

  if (ctx.userType === "facility" && ctx.customerUserId) {
    const customerUser = await prisma.customerUser.findUniqueOrThrow({ where: { id: ctx.customerUserId } });
    if (!verifyPassword(input.currentPassword, customerUser.passwordHash)) {
      throw new UnauthenticatedError("現在のパスワードが正しくありません");
    }
    validatePassword(input.newPassword, { loginId: customerUser.loginId, name: customerUser.name });
    await prisma.customerUser.update({
      where: { id: customerUser.id },
      data: { passwordHash: hashPassword(input.newPassword), passwordChangedAt: new Date() },
    });
    await revokeOtherSessions(undefined, customerUser.id, ctx.sessionId);
    return;
  }

  throw new ForbiddenError("パスワードを変更できません");
}

export async function requestPasswordReset(loginId: string): Promise<void> {
  const internalUser = await findInternalUser(loginId);
  if (internalUser?.email) {
    await createPasswordResetToken("internal", internalUser.id, internalUser.email);
  }
  // 施設ユーザーはメール未登録のため、管理者によるパスワード再発行で対応
}

async function createPasswordResetToken(
  userType: "internal",
  userId: bigint,
  email: string,
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await prisma.passwordResetToken.create({
    data: {
      userType,
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const resetUrl = `${env.publicWebUrl.replace(/\/$/, "")}/password-reset/${token}`;
  const text = [
    "談 業務システムのパスワード再設定のご案内です。",
    "",
    "以下のリンクから新しいパスワードを設定してください（有効期限: 1時間）。",
    resetUrl,
    "",
    "心当たりがない場合は、このメールを破棄してください。",
  ].join("\n");

  await sendEmail({
    to: email,
    subject: "【談】パスワード再設定のご案内",
    text,
  });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
    throw new NotFoundError("リセットリンクが無効か、有効期限が切れています");
  }

  if (resetToken.userType === "internal" && resetToken.userId) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: resetToken.userId } });
    validatePassword(newPassword, { loginId: user.employeeNo, name: user.name });
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword), passwordChangedAt: new Date() },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    return;
  }

  throw new NotFoundError("リセットリンクが無効です");
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

export async function getAuthUserProfile(ctx: RequestContext) {
  if (ctx.userType === "internal" && ctx.userId) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      include: { role: true },
    });
    let customerName: string | undefined;
    if (ctx.impersonatingCustomerId) {
      const customer = await prisma.customer.findUnique({ where: { id: ctx.impersonatingCustomerId } });
      customerName = customer?.name;
    }
    return {
      id: user.id.toString(),
      name: user.name,
      type: "internal" as const,
      role: user.role.code,
      roleName: getRoleDisplayName(user.role.code, user.role.name),
      employeeCode: user.employeeNo,
      haccpNo: user.haccpNo ?? undefined,
      customerId: ctx.impersonatingCustomerId?.toString(),
      customerName,
      impersonating: Boolean(ctx.impersonatingCustomerId),
      passwordChangeRequired: !user.passwordChangedAt,
      permissions: [...ctx.permissions],
    };
  }

  if (ctx.userType === "facility" && ctx.customerUserId) {
    const customerUser = await prisma.customerUser.findUniqueOrThrow({
      where: { id: ctx.customerUserId },
      include: { role: true, customer: true },
    });
    return {
      id: customerUser.id.toString(),
      name: customerUser.name,
      type: "facility" as const,
      role: customerUser.role.code,
      roleName: getRoleDisplayName(customerUser.role.code, customerUser.role.name),
      customerId: customerUser.customerId.toString(),
      customerName: customerUser.customer.name,
      passwordChangeRequired: !customerUser.passwordChangedAt,
      permissions: [...ctx.permissions],
    };
  }

  throw new ForbiddenError("ユーザー情報を取得できません");
}
