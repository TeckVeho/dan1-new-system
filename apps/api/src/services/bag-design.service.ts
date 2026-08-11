import { prisma } from "@dan1/database";
import { NotFoundError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

export async function listBagDesigns(query: {
  customerId?: bigint;
  page: number;
  perPage: number;
}) {
  const where = {
    deletedAt: null,
    ...(query.customerId ? { customerId: query.customerId } : {}),
  };
  const [items, totalCount] = await Promise.all([
    prisma.bagDesign.findMany({
      where,
      include: {
        customer: { select: { id: true, customerCode: true, name: true } },
        units: { include: { unit: { select: { id: true, name: true, unitCode: true } } } },
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.bagDesign.count({ where }),
  ]);
  return { items, totalCount };
}

export async function createBagDesign(input: {
  ctx: RequestContext;
  customerId: bigint;
  name: string;
  facilityNumber?: number;
  maxUnits: number;
  maxMeals: number;
  unitIds: bigint[];
  sortOrder: number;
  isActive: boolean;
}) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("施設が見つかりません");

  const created = await prisma.bagDesign.create({
    data: {
      customerId: input.customerId,
      name: input.name,
      facilityNumber: input.facilityNumber ?? null,
      maxUnits: input.maxUnits,
      maxMeals: input.maxMeals,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      units: {
        create: input.unitIds.map((unitId) => ({ unitId })),
      },
    },
    include: {
      customer: { select: { customerCode: true, name: true } },
      units: { include: { unit: true } },
    },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "create",
    entityType: "bag_design",
    entityId: created.id,
    after: created,
  });
  return created;
}

export async function updateBagDesign(input: {
  ctx: RequestContext;
  id: bigint;
  name?: string;
  facilityNumber?: number | null;
  maxUnits?: number;
  maxMeals?: number;
  unitIds?: bigint[];
  sortOrder?: number;
  isActive?: boolean;
}) {
  const current = await prisma.bagDesign.findUnique({ where: { id: input.id } });
  if (!current || current.deletedAt) throw new NotFoundError("袋設計が見つかりません");

  if (input.unitIds) {
    await prisma.bagDesignUnit.deleteMany({ where: { bagDesignId: input.id } });
    if (input.unitIds.length > 0) {
      await prisma.bagDesignUnit.createMany({
        data: input.unitIds.map((unitId) => ({ bagDesignId: input.id, unitId })),
      });
    }
  }

  const updated = await prisma.bagDesign.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.facilityNumber !== undefined ? { facilityNumber: input.facilityNumber } : {}),
      ...(input.maxUnits !== undefined ? { maxUnits: input.maxUnits } : {}),
      ...(input.maxMeals !== undefined ? { maxMeals: input.maxMeals } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: {
      customer: { select: { customerCode: true, name: true } },
      units: { include: { unit: true } },
    },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "bag_design",
    entityId: input.id,
    before: current,
    after: updated,
  });
  return updated;
}

export async function deleteBagDesign(ctx: RequestContext, id: bigint) {
  const current = await prisma.bagDesign.findUnique({ where: { id } });
  if (!current || current.deletedAt) throw new NotFoundError("袋設計が見つかりません");

  const updated = await prisma.bagDesign.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await recordAuditLog({
    ctx,
    action: "delete",
    entityType: "bag_design",
    entityId: id,
    before: current,
    after: updated,
  });
  return updated;
}

export async function listPickingDestinations(query: { page: number; perPage: number }) {
  const [items, totalCount] = await Promise.all([
    prisma.pickingDestinationRule.findMany({
      include: {
        stockItem: {
          include: { supplier: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.pickingDestinationRule.count(),
  ]);
  return { items, totalCount };
}

export async function upsertPickingDestination(input: {
  ctx: RequestContext;
  stockItemId: bigint;
  destination: string;
  note?: string;
  sortOrder: number;
  isActive: boolean;
}) {
  const stockItem = await prisma.stockItem.findUnique({ where: { id: input.stockItemId } });
  if (!stockItem) throw new NotFoundError("商品が見つかりません");

  const saved = await prisma.pickingDestinationRule.upsert({
    where: { stockItemId: input.stockItemId },
    create: {
      stockItemId: input.stockItemId,
      destination: input.destination,
      note: input.note ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    update: {
      destination: input.destination,
      note: input.note ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    include: { stockItem: { include: { supplier: true } } },
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "picking_destination_rule",
    entityId: saved.id,
    after: saved,
  });
  return saved;
}

export async function deletePickingDestination(ctx: RequestContext, stockItemId: bigint) {
  const current = await prisma.pickingDestinationRule.findUnique({ where: { stockItemId } });
  if (!current) throw new NotFoundError("ピッキング出力先が見つかりません");
  await prisma.pickingDestinationRule.delete({ where: { stockItemId } });
  await recordAuditLog({
    ctx,
    action: "delete",
    entityType: "picking_destination_rule",
    entityId: current.id,
    before: current,
  });
}
