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

const FILE_TYPE_ALIASES: Record<string, string> = {
  cooking_sheet: "menu_a",
  order_file: "menu_b",
  cooking_file: "menu_c",
};

export function normalizeImportFileType(fileType: string): string {
  return FILE_TYPE_ALIASES[fileType] ?? fileType;
}

export type ScheduleQuery = {
  supplierId: bigint;
  deliveryFrom: Date;
  deliveryTo: Date;
  category?: string;
  search?: string;
  shortageOnly?: boolean;
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

  const items = stockItems
    .map((item) => {
      const cells = dates.flatMap((date) => {
        const schedule = schedules.find(
          (s) => s.stockItemId === item.id && s.deliveryDate.getTime() === date.getTime(),
        );
        if (!schedule) return [];
        const orderQty = schedule.orderQuantity.toString();
        const actualStock = schedule.stockQuantity?.toString() ?? null;
        const expectedStock = actualStock ?? "0";
        const isShortage =
          schedule.stockQuantity !== null && Number(schedule.orderQuantity) > Number(schedule.stockQuantity);
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
    })
    .filter((item) => !query.shortageOnly || item.cells.some((c) => c.isShortage));

  return {
    supplier: { id: supplier.id, name: supplier.name },
    dates: dates.map((d) => ({
      date: dateKey(d),
      weekday: ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()],
    })),
    items,
    totalCount: query.shortageOnly ? items.length : totalCount,
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
  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "order_schedule",
    entityId: input.id,
    before: current,
    after: updated,
  });
  return updated;
}

export type ImportBatchInput = {
  ctx: RequestContext;
  supplierId: bigint;
  fileType: string;
  fileId: bigint;
  targetDateFrom?: string;
  targetDateTo?: string;
};

export async function runImportBatch(input: ImportBatchInput): Promise<{ job: Job; importBatchId: bigint }> {
  const normalizedFileType = normalizeImportFileType(input.fileType);
  const batch = await prisma.importBatch.create({
    data: {
      supplierId: input.supplierId,
      fileType: normalizedFileType,
      status: "pending",
      createdBy: input.ctx.userId ?? null,
      params: {
        fileId: input.fileId.toString(),
        targetDateFrom: input.targetDateFrom ?? null,
        targetDateTo: input.targetDateTo ?? null,
        originalFileType: input.fileType,
      },
    },
  });

  const job = await createAndRunJob({
    jobType: "import_procurement_file",
    createdBy: input.ctx.userId,
    params: {
      importBatchId: batch.id.toString(),
      supplierId: input.supplierId.toString(),
      fileType: normalizedFileType,
      fileId: input.fileId.toString(),
      targetDateFrom: input.targetDateFrom ?? null,
      targetDateTo: input.targetDateTo ?? null,
    },
  });

  return { job, importBatchId: batch.id };
}

export type ListImportBatchesQuery = { supplierId?: bigint; page: number; perPage: number };

function mapImportStatus(status: string): "queued" | "running" | "completed" | "failed" {
  if (status === "pending") return "queued";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  return "failed";
}

export async function listImportBatches(query: ListImportBatchesQuery) {
  const where = { ...(query.supplierId ? { supplierId: query.supplierId } : {}) };
  const [items, totalCount] = await Promise.all([
    prisma.importBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: {
        supplier: { select: { name: true } },
      },
    }),
    prisma.importBatch.count({ where }),
  ]);

  const userIds = [...new Set(items.map((i) => i.createdBy).filter((id): id is bigint => id !== null))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
  const userMap = new Map(users.map((u) => [u.id.toString(), u.name]));

  return {
    items: items.map((batch) => {
      const params =
        batch.params && typeof batch.params === "object" ? (batch.params as Record<string, unknown>) : {};
      return {
        id: batch.id.toString(),
        importType: String(params.originalFileType ?? batch.fileType),
        supplierName: batch.supplier.name,
        status: mapImportStatus(batch.status),
        targetDateFrom: String(params.targetDateFrom ?? ""),
        targetDateTo: String(params.targetDateTo ?? ""),
        importedAt: batch.createdAt.toISOString(),
        importedBy: batch.createdBy ? (userMap.get(batch.createdBy.toString()) ?? "—") : "—",
        errorCount: batch.errorCount,
      };
    }),
    totalCount,
  };
}

export type MealCountSyncInput = { ctx: RequestContext; dateFrom: Date; dateTo: Date };

/** FR-702. Aggregates confirmed meal counts for the given range as the procurement basis. */
export async function runMealCountSync(input: MealCountSyncInput): Promise<Job> {
  return createAndRunJob({
    jobType: "meal_count_sync",
    createdBy: input.ctx.userId,
    paramsHash: `${dateKey(input.dateFrom)}:${dateKey(input.dateTo)}`,
    params: { dateFrom: dateKey(input.dateFrom), dateTo: dateKey(input.dateTo) },
  });
}

export type ExportScheduleInput = {
  ctx: RequestContext;
  supplierId: bigint;
  deliveryFrom: Date;
  deliveryTo: Date;
  category?: string;
  search?: string;
  shortageOnly?: boolean;
  format?: "xlsx" | "csv";
};

export async function exportScheduleSpreadsheet(input: ExportScheduleInput): Promise<Job> {
  return createAndRunJob({
    jobType: "export.spreadsheet",
    createdBy: input.ctx.userId,
    params: {
      exportType: "procurement_schedule",
      format: input.format ?? "xlsx",
      query: {
        supplierId: input.supplierId.toString(),
        deliveryFrom: dateKey(input.deliveryFrom),
        deliveryTo: dateKey(input.deliveryTo),
        category: input.category,
        search: input.search,
        shortageOnly: input.shortageOnly ?? false,
      },
    },
  });
}

export type MealCountSyncHistoryQuery = { page: number; perPage: number };

function numberFromResult(result: Record<string, unknown>, key: string): number {
  const value = result[key];
  return typeof value === "number" ? value : 0;
}

/** 食数同期ジョブの実行履歴（実行者・対象期間・件数）を返す */
export async function listMealCountSyncHistory(query: MealCountSyncHistoryQuery) {
  const where = { jobType: "meal_count_sync" };
  const [jobs, totalCount] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return {
    items: jobs.map((job) => {
      const params =
        job.params && typeof job.params === "object" ? (job.params as Record<string, unknown>) : {};
      const result =
        job.result && typeof job.result === "object" ? (job.result as Record<string, unknown>) : {};
      return {
        id: job.id.toString(),
        status: job.status,
        progress: job.progress,
        dateFrom: String(params.dateFrom ?? ""),
        dateTo: String(params.dateTo ?? ""),
        totalMeals: numberFromResult(result, "totalMeals"),
        customerCount: numberFromResult(result, "customerCount"),
        referenceCount: numberFromResult(result, "referenceCount"),
        error: job.error,
        executedBy: job.user?.name ?? "—",
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
      };
    }),
    totalCount,
  };
}

export type ImportCalendarQuery = { month: string; supplierId?: bigint };

function monthRange(month: string): { from: Date; to: Date } {
  const [year, mon] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year!, mon! - 1, 1));
  const to = new Date(Date.UTC(year!, mon!, 0));
  return { from, to };
}

/** 取込バッチを日別に集計してカレンダー表示用データを返す */
export async function getImportCalendar(query: ImportCalendarQuery) {
  const { from, to } = monthRange(query.month);
  const where = {
    createdAt: { gte: from, lte: new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) },
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  };

  const batches = await prisma.importBatch.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: { supplier: { select: { name: true } } },
  });

  const dayMap = new Map<
    string,
    { date: string; total: number; completed: number; failed: number; running: number; queued: number; batches: Array<{ id: string; supplierName: string; fileType: string; status: string }> }
  >();

  for (const batch of batches) {
    const day = dateKey(batch.createdAt);
    const entry = dayMap.get(day) ?? {
      date: day,
      total: 0,
      completed: 0,
      failed: 0,
      running: 0,
      queued: 0,
      batches: [],
    };
    entry.total += 1;
    const status = mapImportStatus(batch.status);
    if (status === "completed") entry.completed += 1;
    else if (status === "failed") entry.failed += 1;
    else if (status === "running") entry.running += 1;
    else entry.queued += 1;
    entry.batches.push({
      id: batch.id.toString(),
      supplierName: batch.supplier.name,
      fileType: batch.fileType,
      status,
    });
    dayMap.set(day, entry);
  }

  return {
    month: query.month,
    days: [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
