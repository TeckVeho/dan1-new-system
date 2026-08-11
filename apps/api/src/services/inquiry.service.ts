import { prisma } from "@dan1/database";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { applyCustomerScope, resolveScopedCustomerId } from "../lib/scope.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";
import {
  createNotificationsForCustomerUsers,
  createNotificationsForInternalUsers,
} from "./notification.service.js";

function senderTypeForContext(ctx: RequestContext): "internal" | "facility" {
  return ctx.userType === "facility" ? "facility" : "internal";
}

function senderUserIdForContext(ctx: RequestContext): bigint | null {
  if (ctx.userType === "facility") return ctx.customerUserId ?? null;
  return ctx.userId ?? null;
}

function oppositeSenderType(ctx: RequestContext): "internal" | "facility" {
  return ctx.userType === "facility" ? "internal" : "facility";
}

function mapMessage(row: {
  id: bigint;
  senderType: string;
  senderUserId: bigint | null;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id.toString(),
    senderType: row.senderType,
    senderUserId: row.senderUserId?.toString() ?? null,
    body: row.body,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapThreadBase(row: {
  id: bigint;
  customerId: bigint;
  subject: string | null;
  status: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { id: bigint; customerCode: string; name: string };
}) {
  return {
    id: row.id.toString(),
    customerId: row.customerId.toString(),
    customerCode: row.customer?.customerCode ?? "",
    customerName: row.customer?.name ?? "",
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getThreadOrThrow(id: bigint, ctx: RequestContext) {
  const thread = await prisma.inquiryThread.findFirst({
    where: applyCustomerScope({ id }, ctx),
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
    },
  });
  if (!thread) throw new NotFoundError("問い合わせが見つかりません");
  return thread;
}

export type ListInquiryThreadsQuery = {
  ctx: RequestContext;
  customerId?: bigint;
  status?: string;
  page: number;
  perPage: number;
};

export async function listInquiryThreads(query: ListInquiryThreadsQuery) {
  const customerId = query.customerId;
  const where = applyCustomerScope(
    {
      ...(customerId ? { customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    query.ctx,
  );

  const [items, totalCount] = await Promise.all([
    prisma.inquiryThread.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: {
        customer: { select: { id: true, customerCode: true, name: true } },
        messages: {
          where: { senderType: oppositeSenderType(query.ctx), readAt: null },
          select: { id: true },
        },
      },
    }),
    prisma.inquiryThread.count({ where }),
  ]);

  const threadIds = items.map((item) => item.id);
  const latestMessages =
    threadIds.length > 0
      ? await prisma.inquiryMessage.findMany({
          where: { threadId: { in: threadIds } },
          orderBy: { createdAt: "desc" },
          distinct: ["threadId"],
        })
      : [];

  const latestByThread = new Map(latestMessages.map((message) => [message.threadId.toString(), message]));

  return {
    items: items.map((item) => ({
      ...mapThreadBase(item),
      unreadCount: item.messages.length,
      lastMessage: latestByThread.has(item.id.toString())
        ? mapMessage(latestByThread.get(item.id.toString())!)
        : null,
    })),
    totalCount,
  };
}

export type CreateInquiryThreadInput = {
  ctx: RequestContext;
  customerId?: bigint;
  subject?: string;
  body: string;
};

export async function createInquiryThread(input: CreateInquiryThreadInput) {
  const customerId = resolveScopedCustomerId(input.ctx, input.customerId);
  const senderType = senderTypeForContext(input.ctx);
  const senderUserId = senderUserIdForContext(input.ctx);
  const now = new Date();

  const created = await prisma.inquiryThread.create({
    data: {
      customerId,
      subject: input.subject ?? null,
      status: "open",
      lastMessageAt: now,
      createdByType: senderType,
      createdById: senderUserId,
      messages: {
        create: {
          senderType,
          senderUserId,
          body: input.body,
        },
      },
    },
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "create",
    entityType: "inquiry_thread",
    entityId: created.id,
    after: { subject: created.subject, customerId: created.customerId.toString() },
  });

  if (senderType === "facility") {
    await createNotificationsForInternalUsers("inquiry.read", {
      title: "新しい問い合わせ",
      body: `${created.customer.name} から問い合わせが届きました${created.subject ? `: ${created.subject}` : ""}`,
      category: "inquiry",
      linkUrl: "/chat",
    });
  } else {
    await createNotificationsForCustomerUsers(customerId, {
      title: "問い合わせを受け付けました",
      body: created.subject ? `件名: ${created.subject}` : "社内から問い合わせを開始しました",
      category: "inquiry",
      linkUrl: "/chat",
    });
  }

  return {
    ...mapThreadBase(created),
    messages: created.messages.map(mapMessage),
  };
}

export async function getInquiryThread(id: bigint, ctx: RequestContext) {
  const thread = await prisma.inquiryThread.findFirst({
    where: applyCustomerScope({ id }, ctx),
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) throw new NotFoundError("問い合わせが見つかりません");

  return {
    ...mapThreadBase(thread),
    messages: thread.messages.map(mapMessage),
    unreadCount: thread.messages.filter(
      (message) => message.senderType === oppositeSenderType(ctx) && message.readAt === null,
    ).length,
  };
}

export async function updateInquiryThreadStatus(id: bigint, ctx: RequestContext, status: string) {
  const thread = await getThreadOrThrow(id, ctx);
  const updated = await prisma.inquiryThread.update({
    where: { id: thread.id },
    data: { status },
    include: {
      customer: { select: { id: true, customerCode: true, name: true } },
    },
  });

  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "inquiry_thread",
    entityId: updated.id,
    before: { status: thread.status },
    after: { status: updated.status },
  });

  return mapThreadBase(updated);
}

export async function postInquiryMessage(id: bigint, ctx: RequestContext, body: string) {
  const thread = await getThreadOrThrow(id, ctx);
  if (thread.status === "closed") {
    throw new ValidationError("終了した問い合わせには返信できません");
  }

  const senderType = senderTypeForContext(ctx);
  const senderUserId = senderUserIdForContext(ctx);
  const now = new Date();

  const message = await prisma.inquiryMessage.create({
    data: {
      threadId: thread.id,
      senderType,
      senderUserId,
      body,
    },
  });

  await prisma.inquiryThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: now, status: "open" },
  });

  await recordAuditLog({
    ctx,
    action: "create",
    entityType: "inquiry_message",
    entityId: message.id,
    after: { threadId: thread.id.toString(), senderType },
  });

  const customer = await prisma.customer.findUnique({
    where: { id: thread.customerId },
    select: { name: true },
  });

  if (senderType === "facility") {
    await createNotificationsForInternalUsers("inquiry.read", {
      title: "問い合わせへの返信",
      body: `${customer?.name ?? "施設"} からメッセージが届きました`,
      category: "inquiry",
      linkUrl: "/chat",
    });
  } else {
    await createNotificationsForCustomerUsers(thread.customerId, {
      title: "問い合わせへの返信",
      body: "社内から返信がありました",
      category: "inquiry",
      linkUrl: "/chat",
    });
  }

  return mapMessage(message);
}

export async function markInquiryThreadRead(id: bigint, ctx: RequestContext) {
  const thread = await getThreadOrThrow(id, ctx);
  const oppositeType = oppositeSenderType(ctx);
  const now = new Date();

  const result = await prisma.inquiryMessage.updateMany({
    where: { threadId: thread.id, senderType: oppositeType, readAt: null },
    data: { readAt: now },
  });

  return { threadId: thread.id.toString(), markedCount: result.count };
}
