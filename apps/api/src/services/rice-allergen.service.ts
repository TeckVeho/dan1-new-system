import { prisma } from "@dan1/database";
import type { MealOrderStatus } from "@dan1/database";
import { VersionConflictError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

export type RiceOrderCell = { unitId: string; serviceDate: string; riceType: string; quantity: number; version?: number | null };

/** Units visible on order forms (`order.read`); scoped to the given facility. */
export async function getCustomerUnitsForOrder(customerId: bigint) {
  return prisma.unit.findMany({
    where: { customerId, deletedAt: null, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** Dropdown data for allergen order screens (`order.read`). */
export async function getAllergenOrderOptions(customerId: bigint) {
  const [units, customerAllergens] = await Promise.all([
    getCustomerUnitsForOrder(customerId),
    prisma.customerAllergen.findMany({
      where: { customerId, deletedAt: null },
      include: { allergenType: true },
      orderBy: { allergenType: { sortOrder: "asc" } },
    }),
  ]);
  return { units, allergens: customerAllergens };
}

export async function getRiceOrders(customerId: bigint, dateFrom: Date, dateTo: Date, unitId?: bigint) {
  return prisma.riceOrder.findMany({
    where: { customerId, serviceDate: { gte: dateFrom, lte: dateTo }, ...(unitId ? { unitId } : {}) },
    orderBy: [{ serviceDate: "asc" }, { unitId: "asc" }],
  });
}

export async function saveRiceOrders(ctx: RequestContext, customerId: bigint, commit: boolean, cells: RiceOrderCell[]) {
  const status: MealOrderStatus = commit ? "provisional" : "draft";
  const saved = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const cell of cells) {
      const unitId = BigInt(cell.unitId);
      const serviceDate = new Date(cell.serviceDate);
      if (cell.version !== undefined && cell.version !== null) {
        const updateResult = await tx.riceOrder.updateMany({
          where: { unitId, serviceDate, riceType: cell.riceType, version: cell.version },
          data: { quantity: cell.quantity, status, version: { increment: 1 } },
        });
        if (updateResult.count === 0) throw new VersionConflictError();
      } else {
        await tx.riceOrder.upsert({
          where: { unitId_serviceDate_riceType: { unitId, serviceDate, riceType: cell.riceType } },
          create: { customerId, unitId, serviceDate, riceType: cell.riceType, quantity: cell.quantity, status },
          update: { quantity: cell.quantity, status, version: { increment: 1 } },
        });
      }
      const row = await tx.riceOrder.findFirst({ where: { unitId, serviceDate, riceType: cell.riceType } });
      if (row) results.push(row);
    }
    return results;
  });

  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "rice_order_bulk",
    entityId: customerId,
    after: { count: saved.length, customerId: customerId.toString() },
  });
  return saved;
}

export type ListRiceOrderLogsQuery = {
  customerId?: bigint;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  perPage: number;
};

/** 合数変更の監査ログを一覧する */
export async function listRiceOrderLogs(query: ListRiceOrderLogsQuery) {
  const where = {
    entityType: { in: ["rice_order", "rice_order_bulk"] },
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (query.page - 1) * query.perPage,
    take: query.perPage,
    include: { user: { select: { id: true, name: true } } },
  });

  const totalCount = await prisma.auditLog.count({ where });

  const customerIds = new Set<bigint>();
  for (const log of logs) {
    if (log.entityType === "rice_order_bulk" && log.entityId) {
      customerIds.add(BigInt(log.entityId));
    }
    const after = log.after && typeof log.after === "object" ? (log.after as Record<string, unknown>) : null;
    if (after?.customerId) customerIds.add(BigInt(String(after.customerId)));
  }

  const customers =
    customerIds.size > 0
      ? await prisma.customer.findMany({
          where: { id: { in: [...customerIds] } },
          select: { id: true, customerCode: true, name: true },
        })
      : [];
  const customerMap = new Map(customers.map((c) => [c.id.toString(), c]));

  const items = logs
    .map((log) => {
      const customerId =
        log.entityType === "rice_order_bulk" && log.entityId
          ? log.entityId
          : log.after && typeof log.after === "object"
            ? String((log.after as Record<string, unknown>).customerId ?? "")
            : "";
      if (query.customerId && customerId !== query.customerId.toString()) return null;
      const customer = customerMap.get(customerId);
      const after = log.after && typeof log.after === "object" ? (log.after as Record<string, unknown>) : null;
      return {
        id: log.id.toString(),
        customerId: customer?.id.toString() ?? customerId,
        customerCode: customer?.customerCode ?? "—",
        customerName: customer?.name ?? "—",
        action: log.action,
        entityType: log.entityType,
        summary:
          log.entityType === "rice_order_bulk"
            ? `合数一括更新（${String(after?.count ?? "—")}件）`
            : "合数更新",
        actorName: log.user?.name ?? "—",
        createdAt: log.createdAt.toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return { items, totalCount };
}

export async function listAllergenOrders(customerId: bigint, dateFrom: Date, dateTo: Date, unitId?: bigint) {
  return prisma.allergenOrder.findMany({
    where: { customerId, serviceDate: { gte: dateFrom, lte: dateTo }, ...(unitId ? { unitId } : {}) },
    include: { allergenType: true },
    orderBy: [{ serviceDate: "asc" }],
  });
}

export type CreateAllergenOrderInput = {
  ctx: RequestContext;
  customerId: bigint;
  unitId: bigint;
  serviceDate: Date;
  allergenTypeId: bigint;
  quantity: number;
};

export async function createAllergenOrder(input: CreateAllergenOrderInput) {
  const created = await prisma.allergenOrder.create({
    data: {
      customerId: input.customerId,
      unitId: input.unitId,
      serviceDate: input.serviceDate,
      allergenTypeId: input.allergenTypeId,
      quantity: input.quantity,
    },
  });
  await recordAuditLog({ ctx: input.ctx, action: "create", entityType: "allergen_order", entityId: created.id, after: created });
  return created;
}

export type UpdateAllergenOrderInput = { ctx: RequestContext; id: bigint; quantity: number; version: number };

export async function updateAllergenOrder(input: UpdateAllergenOrderInput) {
  const updateResult = await prisma.allergenOrder.updateMany({
    where: { id: input.id, version: input.version },
    data: { quantity: input.quantity, version: { increment: 1 } },
  });
  if (updateResult.count === 0) throw new VersionConflictError();
  const updated = await prisma.allergenOrder.findUniqueOrThrow({ where: { id: input.id } });
  await recordAuditLog({ ctx: input.ctx, action: "update", entityType: "allergen_order", entityId: input.id, after: updated });
  return updated;
}
