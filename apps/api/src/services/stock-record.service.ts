import { prisma } from "@dan1/database";
import { NotFoundError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type ListStockRecordsQuery = {
  stockItemId?: bigint;
  recordDateFrom?: Date;
  recordDateTo?: Date;
  page: number;
  perPage: number;
};

export async function listStockRecords(query: ListStockRecordsQuery) {
  const where = {
    ...(query.stockItemId ? { stockItemId: query.stockItemId } : {}),
    ...(query.recordDateFrom || query.recordDateTo
      ? {
          recordDate: {
            ...(query.recordDateFrom ? { gte: query.recordDateFrom } : {}),
            ...(query.recordDateTo ? { lte: query.recordDateTo } : {}),
          },
        }
      : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.stockRecord.findMany({
      where,
      orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: {
        stockItem: { select: { id: true, name: true, unit: true, itemCode: true } },
      },
    }),
    prisma.stockRecord.count({ where }),
  ]);

  const userIds = [...new Set(items.map((i) => i.createdBy).filter((id): id is bigint => id !== null))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
  const userMap = new Map(users.map((u) => [u.id.toString(), u.name]));

  return {
    items: items.map((row) => ({
      id: row.id.toString(),
      stockItemId: row.stockItemId.toString(),
      stockItemName: row.stockItem.name,
      stockItemCode: row.stockItem.itemCode,
      unit: row.stockItem.unit,
      recordDate: dateKey(row.recordDate),
      quantity: row.quantity.toString(),
      recordType: row.recordType,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy ? (userMap.get(row.createdBy.toString()) ?? "—") : "—",
    })),
    totalCount,
  };
}

export type CreateStockRecordInput = {
  ctx: RequestContext;
  stockItemId: bigint;
  recordDate: Date;
  quantity: number;
  recordType: string;
};

export async function createStockRecord(input: CreateStockRecordInput) {
  const stockItem = await prisma.stockItem.findUnique({ where: { id: input.stockItemId } });
  if (!stockItem) throw new NotFoundError("在庫品目が見つかりません");

  const created = await prisma.stockRecord.create({
    data: {
      stockItemId: input.stockItemId,
      recordDate: input.recordDate,
      quantity: input.quantity,
      recordType: input.recordType,
      createdBy: input.ctx.userId ?? null,
    },
    include: {
      stockItem: { select: { id: true, name: true, unit: true, itemCode: true } },
    },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "create",
    entityType: "stock_record",
    entityId: created.id,
    after: created,
  });

  return {
    id: created.id.toString(),
    stockItemId: created.stockItemId.toString(),
    stockItemName: created.stockItem.name,
    stockItemCode: created.stockItem.itemCode,
    unit: created.stockItem.unit,
    recordDate: dateKey(created.recordDate),
    quantity: created.quantity.toString(),
    recordType: created.recordType,
    createdAt: created.createdAt.toISOString(),
  };
}
