import { prisma } from "@dan1/database";
import type { RequestContext } from "../types/context.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";

export type CreateNotificationInput = {
  userId?: bigint | null;
  customerUserId?: bigint | null;
  title: string;
  body: string;
  category: string;
  linkUrl?: string | null;
};

export type ListNotificationsQuery = {
  isRead?: boolean;
  category?: string;
  page: number;
  perPage: number;
};

function buildRecipientWhere(ctx: RequestContext) {
  return ctx.userType === "internal"
    ? { userId: ctx.userId ?? undefined }
    : { customerUserId: ctx.customerUserId ?? undefined };
}

export async function createNotification(input: CreateNotificationInput) {
  if (!input.userId && !input.customerUserId) {
    throw new Error("userId or customerUserId is required");
  }
  return prisma.notification.create({
    data: {
      userId: input.userId ?? null,
      customerUserId: input.customerUserId ?? null,
      title: input.title,
      body: input.body,
      category: input.category,
      linkUrl: input.linkUrl ?? null,
    },
  });
}

export async function createNotificationsForCustomerUsers(
  customerId: bigint,
  input: Omit<CreateNotificationInput, "userId" | "customerUserId">,
) {
  const users = await prisma.customerUser.findMany({
    where: { customerId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  if (users.length === 0) return 0;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      customerUserId: u.id,
      title: input.title,
      body: input.body,
      category: input.category,
      linkUrl: input.linkUrl ?? null,
    })),
  });
  return users.length;
}

export async function createNotificationsForInternalUsers(
  permissionCode: string,
  input: Omit<CreateNotificationInput, "userId" | "customerUserId">,
) {
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
  });

  const recipients = users.filter((u) =>
    u.role.rolePermissions.some(
      (rp) => rp.permission.code === permissionCode || rp.permission.code === "*",
    ),
  );
  if (recipients.length === 0) return 0;

  await prisma.notification.createMany({
    data: recipients.map((u) => ({
      userId: u.id,
      title: input.title,
      body: input.body,
      category: input.category,
      linkUrl: input.linkUrl ?? null,
    })),
  });
  return recipients.length;
}

export async function listNotifications(ctx: RequestContext, query: ListNotificationsQuery) {
  const where = {
    ...buildRecipientWhere(ctx),
    ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    ...(query.category ? { category: query.category } : {}),
  };
  const [items, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.notification.count({ where }),
  ]);
  return { items, totalCount };
}

export async function countUnreadNotifications(ctx: RequestContext) {
  return prisma.notification.count({
    where: { ...buildRecipientWhere(ctx), isRead: false },
  });
}

export async function markNotificationRead(ctx: RequestContext, id: bigint) {
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError();
  const recipientWhere = buildRecipientWhere(ctx);
  const isOwner =
    (recipientWhere.userId !== undefined && existing.userId === recipientWhere.userId) ||
    (recipientWhere.customerUserId !== undefined &&
      existing.customerUserId === recipientWhere.customerUserId);
  if (!isOwner) throw new ForbiddenError("この通知を操作する権限がありません");
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead(ctx: RequestContext) {
  await prisma.notification.updateMany({
    where: { ...buildRecipientWhere(ctx), isRead: false },
    data: { isRead: true },
  });
  return { updated: true };
}
