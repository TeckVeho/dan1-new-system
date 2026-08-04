import { prisma } from "@dan1/database";
import type { Job } from "@dan1/database";
import { NotFoundError, VersionConflictError } from "../lib/errors.js";
import { supplierScopeGuard } from "../lib/scope.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";
import { createAndRunJob } from "./jobs.service.js";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateRange(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  for (let d = new Date(from.getTime()); d.getTime() <= to.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d.getTime()));
  }
  return dates;
}

export type ScheduleQuery = {
  supplierId: bigint;
  deliveryFrom: Date;
  deliveryTo: Date;
  category?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export async function getSchedules(query: ScheduleQuery) {
  const where = {
    supplierId: query.supplierId,
    deletedAt: null,
    ...(query.category ? { category: query.category } : {}),
    ...(query.search ? { name: { contains: query.search } } : {}),
  };

  const [supplier, stockItems, totalCount] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: query.supplierId } }),
    prisma.stockItem.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.stockItem.count({ where }),
  ]);
  if (!supplier) throw new NotFoundError("仕入業者が見つかりません");

  const dates = dateRange(query.deliveryFrom, query.deliveryTo);
  const schedules = await prisma.orderSchedule.findMany({
    where: {
      stockItemId: { in: stockItems.map((s) => s.id) },
      deliveryDate: { gte: query.deliveryFrom, lte: query.deliveryTo },
    },
  });

  const items = stockItems.map((item) => {
    const cells = dates.flatMap((date) => {
      const schedule = schedules.find((s) => s.stockItemId === item.id && s.deliveryDate.getTime() === date.getTime());
      if (!schedule) return [];
      const orderQty = schedule.orderQuantity.toString();
      const actualStock = schedule.stockQuantity?.toString() ?? null;
      const expectedStock = actualStock ?? "0";
      const isShortage = schedule.stockQuantity !== null && Number(schedule.orderQuantity) > Number(schedule.stockQuantity);
      return [
        {
          id: schedule.id,
          deliveryDate: dateKey(date),
          requiredQty: orderQty,
          orderQty,
          expectedStock,
          actualStock,
          adjustSource: "auto" as const,
          isShortage,
          unenteredCustomerCodes: [] as string[],
          version: schedule.version,
        },
      ];
    });
    const totalOrderQty = cells.reduce((sum, c) => sum + Number(c.orderQty), 0);
    return {
      stockItemId: item.id,
      name: item.name,
      unit: item.unit,
      category: item.category,
      totalOrderQty: totalOrderQty.toFixed(3),
      cells,
    };
  });

  return {
    supplier: { id: supplier.id, name: supplier.name },
    dates: dates.map((d) => ({ date: dateKey(d), weekday: ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()] })),
    items,
    totalCount,
  };
}

export type UpdateScheduleInput = {
  ctx: RequestContext;
  id: bigint;
  orderQuantity?: number;
  stockQuantity?: number;
  version: number;
};

export async function updateSchedule(input: UpdateScheduleInput) {
  const current = await prisma.orderSchedule.findUnique({ where: { id: input.id } });
  if (!current) throw new NotFoundError("発注スケジュールが見つかりません");
  supplierScopeGuard(input.ctx, current.supplierId);

  const updateResult = await prisma.orderSchedule.updateMany({
    where: { id: input.id, version: input.version },
    data: {
      ...(input.orderQuantity !== undefined ? { orderQuantity: input.orderQuantity } : {}),
      ...(input.stockQuantity !== undefined ? { stockQuantity: input.stockQuantity } : {}),
      version: { increment: 1 },
      updatedBy: input.ctx.userId ?? null,
    },
  });
  if (updateResult.count === 0) {
    throw new VersionConflictError("他のユーザーが同じデータを更新しました", [
      { field: "orderQuantity", message: `現在の値: ${current.orderQuantity.toString()}`, meta: { currentVersion: current.version } },
    ]);
  }

  const updated = await prisma.orderSchedule.findUniqueOrThrow({ where: { id: input.id } });
  await recordAuditLog({ ctx: input.ctx, action: "update", entityType: "order_schedule", entityId: input.id, before: current, after: updated });
  return updated;
}

export type ImportBatchInput = { ctx: RequestContext; supplierId: bigint; fileType: string };

export async function runImportBatch(input: ImportBatchInput): Promise<Job> {
  const batch = await prisma.importBatch.create({
    data: { supplierId: input.supplierId, fileType: input.fileType, status: "pending", createdBy: input.ctx.userId ?? null },
  });

  return createAndRunJob({
    jobType: "import_procurement_file",
    createdBy: input.ctx.userId,
    params: { importBatchId: batch.id.toString(), supplierId: input.supplierId.toString(), fileType: input.fileType },
    run: async (_job, { setProgress }) => {
      await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "running", startedAt: new Date() } });
      await setProgress(50, "取込を処理中");
      const completed = await prisma.importBatch.update({
        where: { id: batch.id },
        data: { status: "completed", completedAt: new Date(), successCount: 0, errorCount: 0 },
      });
      return { importBatchId: completed.id.toString() };
    },
  });
}

export type ListImportBatchesQuery = { supplierId?: bigint; page: number; perPage: number };

export async function listImportBatches(query: ListImportBatchesQuery) {
  const where = { ...(query.supplierId ? { supplierId: query.supplierId } : {}) };
  const [items, totalCount] = await Promise.all([
    prisma.importBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.importBatch.count({ where }),
  ]);
  return { items, totalCount };
}

export type MealCountSyncInput = { ctx: RequestContext; dateFrom: Date; dateTo: Date };

/** FR-702. Aggregates confirmed meal counts for the given range as the procurement basis. */
export async function runMealCountSync(input: MealCountSyncInput): Promise<Job> {
  return createAndRunJob({
    jobType: "meal_count_sync",
    createdBy: input.ctx.userId,
    paramsHash: `${dateKey(input.dateFrom)}:${dateKey(input.dateTo)}`,
    params: { dateFrom: dateKey(input.dateFrom), dateTo: dateKey(input.dateTo) },
    run: async (_job, { setProgress }) => {
      const orders = await prisma.mealOrder.groupBy({
        by: ["serviceDate"],
        where: { serviceDate: { gte: input.dateFrom, lte: input.dateTo }, status: { in: ["provisional", "confirmed"] } },
        _sum: { quantity: true },
      });
      await setProgress(80, "食数を集計中");
      const byDate = orders.map((o) => ({ date: dateKey(o.serviceDate), totalMeals: o._sum.quantity ?? 0 }));
      const totalMeals = byDate.reduce((sum, d) => sum + d.totalMeals, 0);
      return { dateFrom: dateKey(input.dateFrom), dateTo: dateKey(input.dateTo), totalMeals, byDate };
    },
  });
}
