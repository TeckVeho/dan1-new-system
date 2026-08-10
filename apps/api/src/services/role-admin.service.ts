import { prisma } from "@dan1/database";
import type { rolePermissionsUpdateSchema } from "@dan1/shared";
import { getRoleDisplayName } from "@dan1/shared";
import type { z } from "zod";
import { NotFoundError } from "../lib/errors.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions.js";

type RolePermissionsUpdate = z.infer<typeof rolePermissionsUpdateSchema>;

export async function listRoles() {
  const roles = await prisma.role.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { users: true, customerUsers: true } },
    },
  });
  return roles.map((role) => ({
    id: role.id.toString(),
    code: role.code,
    name: getRoleDisplayName(role.code, role.name),
    scope: role.scope,
    userCount: role._count.users + role._count.customerUsers,
    permissionCodes:
      role.rolePermissions.length > 0
        ? role.rolePermissions.map((rp) => rp.permission.code)
        : DEFAULT_ROLE_PERMISSIONS[role.code] ?? [],
  }));
}

export async function listPermissions() {
  const permissions = await prisma.permission.findMany({ orderBy: [{ category: "asc" }, { code: "asc" }] });
  if (permissions.length === 0) {
    return Object.entries(DEFAULT_ROLE_PERMISSIONS)
      .flatMap(([, codes]) => codes)
      .filter((code) => code !== "*")
      .filter((code, index, arr) => arr.indexOf(code) === index)
      .sort()
      .map((code) => ({
        code,
        name: code,
        category: code.split(".")[0] ?? "other",
      }));
  }
  return permissions.map((p) => ({ code: p.code, name: p.name, category: p.category }));
}

export async function updateRolePermissions(roleId: bigint, input: RolePermissionsUpdate) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new NotFoundError("ロールが見つかりません");
  if (role.code === "system_admin") {
    throw new NotFoundError("システム管理者の権限は変更できません");
  }

  const permissions = await prisma.permission.findMany({
    where: { code: { in: input.permissionCodes } },
  });
  const permissionIds = new Set(permissions.map((p) => p.id));

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: [...permissionIds].map((permissionId) => ({ roleId, permissionId })),
    }),
  ]);

  const updated = await prisma.role.findUniqueOrThrow({
    where: { id: roleId },
    include: { rolePermissions: { include: { permission: true } } },
  });
  return {
    id: updated.id.toString(),
    code: updated.code,
    name: getRoleDisplayName(updated.code, updated.name),
    permissionCodes: updated.rolePermissions.map((rp) => rp.permission.code),
  };
}
