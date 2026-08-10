import { prisma } from "@dan1/database";

export type CreateNotificationInput = {
  userId?: bigint | null;
  customerUserId?: bigint | null;
  title: string;
  body: string;
  category: string;
  linkUrl?: string | null;
};

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
