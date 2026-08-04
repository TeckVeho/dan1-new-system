import { prisma } from "@dan1/database";
import type { MealOrderStatus } from "@dan1/database";
import type { MealOrderUpsertInput } from "@dan1/shared";
import { DeadlineExceededError, VersionConflictError } from "../lib/errors.js";
import { resolveDeadlinesForRange } from "./deadline.service.js";
import { recordAuditLog } from "./audit.service.js";
import type { RequestContext } from "../types/context.js";

function toDateOnly(value: string | Date): Date {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function weekDates(weekStart: string | Date): Date[] {
  const start = toDateOnly(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export type WeeklyOrdersQuery = { customerId: bigint; unitId?: bigint; weekStart: string };

export async function getWeeklyOrders(query: WeeklyOrdersQuery) {
  const dates = weekDates(query.weekStart);
  const normalOrderType = await prisma.orderType.findUnique({ where: { code: "normal" } });

  const [units, mealTypes, menuKinds] = await Promise.all([
    prisma.unit.findMany({
      where: { customerId: query.customerId, deletedAt: null, ...(query.unitId ? { id: query.unitId } : {}) },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.mealType.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.menuKind.findMany({
      where: { isActive: true, deletedAt: null },
      include: { swallowCategory: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const orders = await prisma.mealOrder.findMany({
    where: {
      customerId: query.customerId,
      serviceDate: { gte: dates[0], lte: dates[6] },
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(normalOrderType ? { orderTypeId: normalOrderType.id } : {}),
    },
  });

  const deadlineByDate = await resolveDeadlinesForRange(dates, query.customerId, "normal");

  const dateRows = dates.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const resolved = deadlineByDate.get(key);
    return {
      date: key,
      weekday: WEEKDAY_LABELS[date.getUTCDay()],
      editable: resolved ? resolved.deadlineAt.getTime() > Date.now() : true,
      deadlineAt: resolved?.deadlineAt.toISOString() ?? null,
    };
  });

  const rows: unknown[] = [];
  for (const unit of units) {
    for (const mealType of mealTypes) {
      for (const menuKind of menuKinds) {
        const cells = dates.map((date) => {
          const match = orders.find(
            (o) =>
              o.unitId === unit.id &&
              o.mealTypeId === mealType.id &&
              o.menuKindId === menuKind.id &&
              o.serviceDate.getTime() === date.getTime(),
          );
          return {
            date: date.toISOString().slice(0, 10),
            orderId: match?.id ?? null,
            quantity: match?.quantity ?? null,
            status: match?.status ?? null,
            version: match?.version ?? null,
          };
        });
        if (cells.every((c) => c.orderId === null)) continue;
        rows.push({
          unitId: unit.id,
          unitName: unit.name,
          unitSortOrder: unit.sortOrder,
          mealTypeId: mealType.id,
          mealTypeName: mealType.name,
          mealTypeSortOrder: mealType.sortOrder,
          menuKindId: menuKind.id,
          menuKindName: menuKind.name,
          menuKindSortOrder: menuKind.sortOrder,
          swallowCategory: menuKind.swallowCategory
            ? { id: menuKind.swallowCategory.id, code: menuKind.swallowCategory.code, name: menuKind.swallowCategory.name, sortOrder: menuKind.swallowCategory.sortOrder }
            : null,
          cells,
        });
      }
    }
  }

  return { weekStart: dates[0].toISOString().slice(0, 10), dates: dateRows, rows };
}

export type SaveWeeklyOrdersInput = {
  ctx: RequestContext;
  customerId: bigint;
  commit: boolean;
  orders: MealOrderUpsertInput[];
};

export async function saveWeeklyOrders(input: SaveWeeklyOrdersInput) {
  const { ctx, customerId, commit, orders } = input;
  if (orders.length === 0) return { saved: 0, cells: [] };

  const uniqueDates = [...new Set(orders.map((o) => o.serviceDate))];
  const deadlines = await resolveDeadlinesForRange(
    uniqueDates.map((d) => toDateOnly(d)),
    customerId,
    "normal",
  );

  const canBypassDeadline = ctx.permissions.has("*") || ctx.permissions.has("order.update_after_deadline");
  const deadlineErrors = orders
    .map((order, index) => {
      const resolved = deadlines.get(toDateOnly(order.serviceDate).toISOString().slice(0, 10));
      if (!resolved) return null;
      if (resolved.deadlineAt.getTime() < Date.now() && !canBypassDeadline) {
        return {
          field: `orders[${index}]`,
          code: "DEADLINE_EXCEEDED",
          message: `${order.serviceDate} 喫食分は締切を過ぎています`,
          meta: { serviceDate: order.serviceDate, deadlineAt: resolved.deadlineAt.toISOString() },
        };
      }
      return null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (deadlineErrors.length > 0) {
    throw new DeadlineExceededError("一部の喫食日が締切を過ぎています", deadlineErrors);
  }

  const status: MealOrderStatus = commit ? "provisional" : "draft";

  const result = await prisma.$transaction(async (tx) => {
    const savedCells = [];
    for (const order of orders) {
      const serviceDate = toDateOnly(order.serviceDate);
      const unitId = BigInt(order.unitId);
      const mealTypeId = BigInt(order.mealTypeId);
      const menuKindId = BigInt(order.menuKindId);
      const orderTypeId = BigInt(order.orderTypeId);

      if (order.version !== undefined && order.version !== null) {
        const updateResult = await tx.mealOrder.updateMany({
          where: { unitId, serviceDate, mealTypeId, menuKindId, orderTypeId, version: order.version },
          data: { quantity: order.quantity, status, version: { increment: 1 }, updatedBy: ctx.userId ?? null },
        });
        if (updateResult.count === 0) {
          const current = await tx.mealOrder.findFirst({ where: { unitId, serviceDate, mealTypeId, menuKindId, orderTypeId } });
          throw new VersionConflictError("他のユーザーが同じデータを更新しました", [
            {
              field: "quantity",
              message: `現在の値: ${current?.quantity ?? "不明"} / あなたの入力: ${order.quantity}`,
              meta: { currentValue: current?.quantity, currentVersion: current?.version },
            },
          ]);
        }
      } else {
        await tx.mealOrder.upsert({
          where: { unitId_serviceDate_mealTypeId_menuKindId_orderTypeId: { unitId, serviceDate, mealTypeId, menuKindId, orderTypeId } },
          create: { customerId, unitId, serviceDate, mealTypeId, menuKindId, orderTypeId, quantity: order.quantity, status, createdBy: ctx.userId ?? null, updatedBy: ctx.userId ?? null },
          update: { quantity: order.quantity, status, version: { increment: 1 }, updatedBy: ctx.userId ?? null },
        });
      }

      const saved = await tx.mealOrder.findFirst({ where: { unitId, serviceDate, mealTypeId, menuKindId, orderTypeId } });
      if (saved) {
        savedCells.push({
          unitId: saved.unitId,
          serviceDate: saved.serviceDate.toISOString().slice(0, 10),
          mealTypeId: saved.mealTypeId,
          menuKindId: saved.menuKindId,
          orderId: saved.id,
          quantity: saved.quantity,
          version: saved.version,
        });

        if (commit) {
          await tx.orderChangeLog.create({
            data: {
              mealOrderId: saved.id,
              fieldName: "quantity",
              afterValue: String(saved.quantity),
              changedBy: ctx.userId ?? null,
            },
          });
        }
      }
    }
    return savedCells;
  });

  await recordAuditLog({
    ctx,
    action: "update",
    entityType: "meal_order_bulk",
    entityId: customerId,
    after: { count: result.length, commit },
  });

  const byDate = new Map<string, number>();
  const byUnit = new Map<string, number>();
  for (const cell of result) {
    byDate.set(cell.serviceDate, (byDate.get(cell.serviceDate) ?? 0) + cell.quantity);
    const unitKey = cell.unitId.toString();
    byUnit.set(unitKey, (byUnit.get(unitKey) ?? 0) + cell.quantity);
  }

  return {
    saved: result.length,
    cells: result,
    summary: {
      byDate: [...byDate.entries()].map(([date, total]) => ({ date, total })),
      byUnit: [...byUnit.entries()].map(([unitId, total]) => ({ unitId, total })),
    },
  };
}

export type OrderHistoryQuery = { customerId: bigint; serviceDateFrom?: Date; serviceDateTo?: Date; page: number; perPage: number };

export async function getOrderHistory(query: OrderHistoryQuery) {
  const where = {
    mealOrder: {
      customerId: query.customerId,
      ...(query.serviceDateFrom || query.serviceDateTo
        ? {
            serviceDate: {
              ...(query.serviceDateFrom ? { gte: query.serviceDateFrom } : {}),
              ...(query.serviceDateTo ? { lte: query.serviceDateTo } : {}),
            },
          }
        : {}),
    },
  };
  const [items, totalCount] = await Promise.all([
    prisma.orderChangeLog.findMany({
      where,
      include: { mealOrder: true },
      orderBy: { changedAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.orderChangeLog.count({ where }),
  ]);
  return { items, totalCount };
}

export type UnenteredFacilitiesQuery = { serviceDateFrom: Date; serviceDateTo: Date };

export async function getUnenteredFacilities(query: UnenteredFacilitiesQuery) {
  const customers = await prisma.customer.findMany({
    where: { isActive: true, deletedAt: null },
    include: { orderSuspensions: true },
  });

  const dates: Date[] = [];
  for (let d = new Date(query.serviceDateFrom.getTime()); d.getTime() <= query.serviceDateTo.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d.getTime()));
  }

  const alerts: unknown[] = [];
  const excluded = { contractEnded: 0, orderSuspended: 0, longHoliday: 0, weekdayNotApplicable: 0 };

  for (const customer of customers) {
    for (const date of dates) {
      if (customer.contractEndDate && customer.contractEndDate.getTime() < date.getTime()) {
        excluded.contractEnded += 1;
        continue;
      }
      const suspended = customer.orderSuspensions.some(
        (s) => s.startDate.getTime() <= date.getTime() && (s.endDate === null || s.endDate.getTime() >= date.getTime()),
      );
      if (suspended) {
        excluded.orderSuspended += 1;
        continue;
      }

      const orderCount = await prisma.mealOrder.count({ where: { customerId: customer.id, serviceDate: date } });
      if (orderCount === 0) {
        const riceCount = await prisma.riceOrder.count({ where: { customerId: customer.id, serviceDate: date } });
        const missingTypes = ["meal_count", ...(riceCount === 0 ? ["rice"] : [])];
        const lastOrder = await prisma.mealOrder.findFirst({
          where: { customerId: customer.id, serviceDate: { lt: date } },
          orderBy: { serviceDate: "desc" },
        });
        alerts.push({
          customerId: customer.id,
          customerCode: customer.customerCode,
          customerName: customer.name,
          serviceDate: date.toISOString().slice(0, 10),
          missingTypes,
          previousOrderSummary: lastOrder
            ? { lastServiceDate: lastOrder.serviceDate.toISOString().slice(0, 10), totalQuantity: lastOrder.quantity }
            : null,
          alertStatus: "unhandled",
        });
      }
    }
  }

  return { alerts, excluded };
}
