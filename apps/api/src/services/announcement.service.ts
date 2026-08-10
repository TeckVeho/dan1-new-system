import { prisma } from "@dan1/database";
import type { RequestContext } from "../types/context.js";

export type AnnouncementFeedQuery = {
  ctx: RequestContext;
  page: number;
  perPage: number;
  category?: string;
};

function resolveReader(ctx: RequestContext): { readerType: string; readerId: bigint } | null {
  if (ctx.userType === "internal" && ctx.userId) {
    return { readerType: "internal", readerId: ctx.userId };
  }
  if (ctx.userType === "facility" && ctx.customerUserId) {
    return { readerType: "facility", readerId: ctx.customerUserId };
  }
  return null;
}

export async function listAnnouncementFeed(query: AnnouncementFeedQuery) {
  const now = new Date();
  const customerId = query.ctx.customerId ?? query.ctx.impersonatingCustomerId;
  let customerGroupId: bigint | undefined;
  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { customerGroupId: true },
    });
    customerGroupId = customer?.customerGroupId ?? undefined;
  }

  const where = {
    isActive: true,
    publishFrom: { lte: now },
    OR: [{ publishTo: null }, { publishTo: { gte: now } }],
    ...(query.category ? { category: query.category } : {}),
    AND: [
      {
        OR: [
          { targetScopeType: "all" },
          ...(customerId ? [{ targetScopeType: "customer", targetScopeId: customerId }] : []),
          ...(customerGroupId ? [{ targetScopeType: "customer_group", targetScopeId: customerGroupId }] : []),
        ],
      },
    ],
  };

  const [items, totalCount] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { publishFrom: "desc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.announcement.count({ where }),
  ]);

  const reader = resolveReader(query.ctx);
  const readIds = reader
    ? new Set(
        (
          await prisma.announcementRead.findMany({
            where: { readerType: reader.readerType, readerId: reader.readerId },
            select: { announcementId: true },
          })
        ).map((r) => r.announcementId),
      )
    : new Set<bigint>();

  return {
    items: items.map((item) => ({
      id: item.id.toString(),
      title: item.title,
      body: item.body,
      category: item.category,
      severity: item.severity,
      isPinned: item.isPinned,
      publishFrom: item.publishFrom.toISOString(),
      publishTo: item.publishTo?.toISOString() ?? null,
      isRead: readIds.has(item.id),
    })),
    totalCount,
  };
}

export async function markAnnouncementRead(ctx: RequestContext, announcementId: bigint) {
  const reader = resolveReader(ctx);
  if (!reader) return null;
  return prisma.announcementRead.upsert({
    where: {
      announcementId_readerType_readerId: {
        announcementId,
        readerType: reader.readerType,
        readerId: reader.readerId,
      },
    },
    create: {
      announcementId,
      readerType: reader.readerType,
      readerId: reader.readerId,
    },
    update: { readAt: new Date() },
  });
}
