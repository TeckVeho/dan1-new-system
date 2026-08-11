import { randomBytes } from "node:crypto";
import { prisma } from "@dan1/database";
import type {
  adminPasswordResetSchema,
  facilityUserCreateSchema,
  facilityUserUpdateSchema,
  internalUserCreateSchema,
  internalUserUpdateSchema,
} from "@dan1/shared";
import { getRoleDisplayName } from "@dan1/shared";
import type { z } from "zod";
import { hashPassword } from "../lib/password.js";
import { validatePassword } from "../lib/password-policy.js";
import { BusinessRuleViolationError, DuplicateResourceError, NotFoundError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

type InternalUserCreate = z.infer<typeof internalUserCreateSchema>;
type InternalUserUpdate = z.infer<typeof internalUserUpdateSchema>;
type FacilityUserCreate = z.infer<typeof facilityUserCreateSchema>;
type FacilityUserUpdate = z.infer<typeof facilityUserUpdateSchema>;
type AdminPasswordReset = z.infer<typeof adminPasswordResetSchema>;

function generateTempPassword(): string {
  return `Tmp${randomBytes(6).toString("base64url")}!1`;
}

function serializeInternalUser(user: {
  id: bigint;
  employeeNo: string;
  haccpNo: string | null;
  name: string;
  email: string | null;
  isActive: boolean;
  role: { id: bigint; code: string; name: string };
  supplierScopes: { supplierId: bigint }[];
}) {
  return {
    id: user.id.toString(),
    type: "internal" as const,
    employeeNo: user.employeeNo,
    haccpNo: user.haccpNo,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    role: {
      id: user.role.id.toString(),
      code: user.role.code,
      name: getRoleDisplayName(user.role.code, user.role.name),
    },
    supplierIds: user.supplierScopes.map((s) => s.supplierId.toString()),
  };
}

function serializeFacilityUser(user: {
  id: bigint;
  loginId: string;
  name: string;
  isActive: boolean;
  customer: { id: bigint; customerCode: string; name: string };
  role: { id: bigint; code: string; name: string };
}) {
  return {
    id: user.id.toString(),
    type: "facility" as const,
    loginId: user.loginId,
    name: user.name,
    isActive: user.isActive,
    customer: {
      id: user.customer.id.toString(),
      customerCode: user.customer.customerCode,
      name: user.customer.name,
    },
    role: {
      id: user.role.id.toString(),
      code: user.role.code,
      name: getRoleDisplayName(user.role.code, user.role.name),
    },
  };
}

async function invalidateInternalUserSessions(userId: bigint) {
  await prisma.session.deleteMany({ where: { userId } });
}

async function invalidateFacilityUserSessions(customerUserId: bigint) {
  await prisma.session.deleteMany({ where: { customerUserId } });
}

async function assertCanDeleteInternalUser(ctx: RequestContext, id: bigint) {
  if (ctx.userId !== undefined && ctx.userId === id) {
    throw new BusinessRuleViolationError("自分自身のアカウントは削除できません");
  }

  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { role: true, supplierScopes: true },
  });
  if (!existing) throw new NotFoundError("ユーザーが見つかりません");

  if (existing.role.code === "system_admin") {
    const activeSystemAdmins = await prisma.user.count({
      where: { deletedAt: null, isActive: true, role: { code: "system_admin" } },
    });
    if (activeSystemAdmins <= 1) {
      throw new BusinessRuleViolationError("最後のシステム管理者は削除できません");
    }
  }

  return existing;
}

export async function listUsers(params: {
  type?: "internal" | "facility";
  search?: string;
  page: number;
  pageSize: number;
}) {
  const { type, search, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  if (type === "facility") {
    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { loginId: { contains: search } },
              { name: { contains: search } },
              { customer: { name: { contains: search } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customerUser.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { loginId: "asc" },
        include: { role: true, customer: true },
      }),
      prisma.customerUser.count({ where }),
    ]);
    return { items: items.map(serializeFacilityUser), total, page, pageSize };
  }

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { employeeNo: { contains: search } },
            { haccpNo: { contains: search } },
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { employeeNo: "asc" },
      include: { role: true, supplierScopes: true },
    }),
    prisma.user.count({ where }),
  ]);
  return { items: items.map(serializeInternalUser), total, page, pageSize };
}

export async function createInternalUser(ctx: RequestContext, input: InternalUserCreate) {
  const role = await prisma.role.findUnique({ where: { id: BigInt(input.roleId) } });
  if (!role || role.scope !== "internal") throw new NotFoundError("ロールが見つかりません");

  const password = input.password ?? generateTempPassword();
  validatePassword(password, { loginId: input.employeeNo, name: input.name });

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          employeeNo: input.employeeNo,
          haccpNo: input.haccpNo ?? null,
          name: input.name,
          email: input.email ?? null,
          passwordHash: hashPassword(password),
          passwordChangedAt: input.password ? new Date() : null,
          roleId: role.id,
        },
        include: { role: true, supplierScopes: true },
      });
      if (input.supplierIds?.length) {
        await tx.userSupplierScope.createMany({
          data: input.supplierIds.map((supplierId: string) => ({
            userId: created.id,
            supplierId: BigInt(supplierId),
          })),
        });
      }
      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { role: true, supplierScopes: true },
      });
    });

    const serialized = serializeInternalUser(user);
    await recordAuditLog({
      ctx,
      action: "create",
      entityType: "internal_user",
      entityId: user.id,
      after: serialized,
    });

    return { user: serialized, temporaryPassword: input.password ? undefined : password };
  } catch {
    throw new DuplicateResourceError("同じ社員番号またはHACCP番号のユーザーが既に存在します");
  }
}

export async function updateInternalUser(ctx: RequestContext, id: bigint, input: InternalUserUpdate) {
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { role: true, supplierScopes: true },
  });
  if (!existing) throw new NotFoundError("ユーザーが見つかりません");

  if (input.roleId) {
    const role = await prisma.role.findUnique({ where: { id: BigInt(input.roleId) } });
    if (!role || role.scope !== "internal") throw new NotFoundError("ロールが見つかりません");
  }

  const before = serializeInternalUser(existing);
  const roleChanged = input.roleId !== undefined && BigInt(input.roleId) !== existing.roleId;
  const deactivated = input.isActive === false && existing.isActive;

  const user = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        ...(input.employeeNo !== undefined ? { employeeNo: input.employeeNo } : {}),
        ...(input.haccpNo !== undefined ? { haccpNo: input.haccpNo } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.roleId !== undefined ? { roleId: BigInt(input.roleId) } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    if (input.supplierIds !== undefined) {
      await tx.userSupplierScope.deleteMany({ where: { userId: id } });
      if (input.supplierIds.length > 0) {
        await tx.userSupplierScope.createMany({
          data: input.supplierIds.map((supplierId: string) => ({ userId: id, supplierId: BigInt(supplierId) })),
        });
      }
    }
    if (roleChanged || deactivated) {
      await tx.session.deleteMany({ where: { userId: id } });
    }
    return tx.user.findUniqueOrThrow({
      where: { id },
      include: { role: true, supplierScopes: true },
    });
  });

  const after = serializeInternalUser(user);
  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "internal_user",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function deleteInternalUser(ctx: RequestContext, id: bigint) {
  const existing = await assertCanDeleteInternalUser(ctx, id);
  const before = serializeInternalUser(existing);

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);

  await recordAuditLog({
    ctx,
    action: "delete",
    entityType: "internal_user",
    entityId: id,
    before,
  });
}

export async function createFacilityUser(ctx: RequestContext, input: FacilityUserCreate) {
  const role = await prisma.role.findUnique({ where: { id: BigInt(input.roleId) } });
  if (!role || role.scope !== "facility") throw new NotFoundError("ロールが見つかりません");

  const customer = await prisma.customer.findFirst({
    where: { id: BigInt(input.customerId), deletedAt: null },
  });
  if (!customer) throw new NotFoundError("施設が見つかりません");

  const password = input.password ?? generateTempPassword();
  validatePassword(password, { loginId: input.loginId, name: input.name });

  try {
    const user = await prisma.customerUser.create({
      data: {
        customerId: customer.id,
        loginId: input.loginId,
        name: input.name,
        passwordHash: hashPassword(password),
        passwordChangedAt: input.password ? new Date() : null,
        roleId: role.id,
      },
      include: { role: true, customer: true },
    });

    const serialized = serializeFacilityUser(user);
    await recordAuditLog({
      ctx,
      action: "create",
      entityType: "facility_user",
      entityId: user.id,
      after: serialized,
    });

    return { user: serialized, temporaryPassword: input.password ? undefined : password };
  } catch {
    throw new DuplicateResourceError("同じログインIDの施設ユーザーが既に存在します");
  }
}

export async function updateFacilityUser(ctx: RequestContext, id: bigint, input: FacilityUserUpdate) {
  const existing = await prisma.customerUser.findFirst({
    where: { id, deletedAt: null },
    include: { role: true, customer: true },
  });
  if (!existing) throw new NotFoundError("ユーザーが見つかりません");

  if (input.roleId) {
    const role = await prisma.role.findUnique({ where: { id: BigInt(input.roleId) } });
    if (!role || role.scope !== "facility") throw new NotFoundError("ロールが見つかりません");
  }

  const before = serializeFacilityUser(existing);
  const roleChanged = input.roleId !== undefined && BigInt(input.roleId) !== existing.roleId;
  const deactivated = input.isActive === false && existing.isActive;

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.customerUser.update({
      where: { id },
      data: {
        ...(input.loginId !== undefined ? { loginId: input.loginId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.roleId !== undefined ? { roleId: BigInt(input.roleId) } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { role: true, customer: true },
    });
    if (roleChanged || deactivated) {
      await tx.session.deleteMany({ where: { customerUserId: id } });
    }
    return updated;
  });

  const after = serializeFacilityUser(user);
  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "facility_user",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function deleteFacilityUser(ctx: RequestContext, id: bigint) {
  const existing = await prisma.customerUser.findFirst({
    where: { id, deletedAt: null },
    include: { role: true, customer: true },
  });
  if (!existing) throw new NotFoundError("ユーザーが見つかりません");

  const before = serializeFacilityUser(existing);

  await prisma.$transaction([
    prisma.customerUser.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    }),
    prisma.session.deleteMany({ where: { customerUserId: id } }),
  ]);

  await recordAuditLog({
    ctx,
    action: "delete",
    entityType: "facility_user",
    entityId: id,
    before,
  });
}

export async function resetUserPassword(
  ctx: RequestContext,
  type: "internal" | "facility",
  id: bigint,
  input: AdminPasswordReset,
) {
  const password = input.newPassword ?? generateTempPassword();

  if (type === "internal") {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true, supplierScopes: true },
    });
    if (!user) throw new NotFoundError("ユーザーが見つかりません");
    validatePassword(password, { loginId: user.employeeNo, name: user.name });
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { passwordHash: hashPassword(password), passwordChangedAt: null },
      }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);
    await recordAuditLog({
      ctx,
      action: "update",
      entityType: "internal_user",
      entityId: id,
      after: { passwordReset: true },
    });
    return { temporaryPassword: input.newPassword ? undefined : password };
  }

  const user = await prisma.customerUser.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new NotFoundError("ユーザーが見つかりません");
  validatePassword(password, { loginId: user.loginId, name: user.name });
  await prisma.$transaction([
    prisma.customerUser.update({
      where: { id },
      data: { passwordHash: hashPassword(password), passwordChangedAt: null },
    }),
    prisma.session.deleteMany({ where: { customerUserId: id } }),
  ]);
  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "facility_user",
    entityId: id,
    after: { passwordReset: true },
  });
  return { temporaryPassword: input.newPassword ? undefined : password };
}
