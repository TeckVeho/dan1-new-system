import { prisma } from "@dan1/database";
import { NotFoundError, ValidationError, VersionConflictError } from "../lib/errors.js";
import { resolveOptionalScopedCustomerId } from "../lib/scope.js";
import type { RequestContext } from "../types/context.js";
import { recordAuditLog } from "./audit.service.js";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function mapAdjustment(row: {
  id: bigint;
  customerId: bigint;
  serviceDate: Date;
  mealTypeId: bigint;
  adjustMeals: number;
  reason: string | null;
  version: number;
  updatedAt: Date;
  customer?: { customerCode: string; name: string };
  mealType?: { code: string; name: string };
}) {
  return {
    id: row.id.toString(),
    customerId: row.customerId.toString(),
    customerCode: row.customer?.customerCode ?? "",
    customerName: row.customer?.name ?? "",
    serviceDate: dateKey(row.serviceDate),
    mealTypeId: row.mealTypeId.toString(),
    mealTypeCode: row.mealType?.code ?? "",
    mealTypeName: row.mealType?.name ?? "",
    adjustMeals: row.adjustMeals,
    reason: row.reason,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type ListMealCountAdjustmentsQuery = {
  ctx: RequestContext;
  customerId?: bigint;
  serviceDateFrom?: Date;
  serviceDateTo?: Date;
  page: number;
  perPage: number;
};

export async function listMealCountAdjustments(query: ListMealCountAdjustmentsQuery) {
  const customerId = resolveOptionalScopedCustomerId(query.ctx, query.customerId);
  const where = {
    ...(customerId ? { customerId } : {}),
    ...(query.serviceDateFrom || query.serviceDateTo
      ? {
          serviceDate: {
            ...(query.serviceDateFrom ? { gte: query.serviceDateFrom } : {}),
            ...(query.serviceDateTo ? { lte: query.serviceDateTo } : {}),
          },
        }
      : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.mealCountAdjustment.findMany({
      where,
      orderBy: [{ serviceDate: "desc" }, { customerId: "asc" }, { mealTypeId: "asc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: {
        customer: { select: { customerCode: true, name: true } },
        mealType: { select: { code: true, name: true } },
      },
    }),
    prisma.mealCountAdjustment.count({ where }),
  ]);

  return {
    items: items.map(mapAdjustment),
    totalCount,
  };
}

export type MealCountAdjustmentInput = {
  customerId: bigint;
  serviceDate: Date;
  mealTypeId: bigint;
  adjustMeals: number;
  reason?: string;
  version?: number;
};

export type BulkUpsertMealCountAdjustmentsInput = {
  ctx: RequestContext;
  items: MealCountAdjustmentInput[];
};

export async function bulkUpsertMealCountAdjustments(input: BulkUpsertMealCountAdjustmentsInput) {
  const saved = [];

  for (const item of input.items) {
    const customerId = resolveOptionalScopedCustomerId(input.ctx, item.customerId);
    if (!customerId) {
      throw new NotFoundError("customerId を指定してください");
    }

    const [customer, mealType] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.mealType.findUnique({ where: { id: item.mealTypeId } }),
    ]);
    if (!customer) throw new NotFoundError("施設が見つかりません");
    if (!mealType) throw new NotFoundError("食事区分が見つかりません");

    const existing = await prisma.mealCountAdjustment.findUnique({
      where: {
        customerId_serviceDate_mealTypeId: {
          customerId,
          serviceDate: item.serviceDate,
          mealTypeId: item.mealTypeId,
        },
      },
    });

    if (existing) {
      const expectedVersion = item.version ?? existing.version;
      const updated = await prisma.mealCountAdjustment.updateMany({
        where: { id: existing.id, version: expectedVersion },
        data: {
          adjustMeals: item.adjustMeals,
          reason: item.reason ?? null,
          version: { increment: 1 },
          updatedBy: input.ctx.userId ?? null,
        },
      });
      if (updated.count === 0) {
        throw new VersionConflictError("他のユーザーが同じデータを更新しました", [
          {
            field: "version",
            message: "再読み込みしてからやり直してください",
          },
        ]);
      }

      const row = await prisma.mealCountAdjustment.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          customer: { select: { customerCode: true, name: true } },
          mealType: { select: { code: true, name: true } },
        },
      });
      saved.push(mapAdjustment(row));

      await recordAuditLog({
        ctx: input.ctx,
        action: "update",
        entityType: "meal_count_adjustment",
        entityId: row.id,
        before: existing,
        after: row,
      });
    } else {
      if (item.version !== undefined && item.version > 0) {
        throw new VersionConflictError("他のユーザーが同じデータを更新しました", [
          { field: "version", message: "再読み込みしてからやり直してください" },
        ]);
      }

      const created = await prisma.mealCountAdjustment.create({
        data: {
          customerId,
          serviceDate: item.serviceDate,
          mealTypeId: item.mealTypeId,
          adjustMeals: item.adjustMeals,
          reason: item.reason ?? null,
          createdBy: input.ctx.userId ?? null,
          updatedBy: input.ctx.userId ?? null,
        },
        include: {
          customer: { select: { customerCode: true, name: true } },
          mealType: { select: { code: true, name: true } },
        },
      });
      saved.push(mapAdjustment(created));

      await recordAuditLog({
        ctx: input.ctx,
        action: "create",
        entityType: "meal_count_adjustment",
        entityId: created.id,
        after: created,
      });
    }
  }

  return saved;
}
