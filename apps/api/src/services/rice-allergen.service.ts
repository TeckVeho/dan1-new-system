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

  await recordAuditLog({ ctx, action: "update", entityType: "rice_order_bulk", entityId: customerId, after: { count: saved.length } });
  return saved;
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
