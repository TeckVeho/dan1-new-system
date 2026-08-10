import { prisma } from "@dan1/database";
import type { MealOrderStatus } from "@dan1/database";
import type { MealOrderUpsertInput } from "@dan1/shared";
import { DeadlineExceededError, NotFoundError, ScopeViolationError, VersionConflictError } from "../lib/errors.js";
import { getActiveReferenceRuleCode, isOrderDayForReferenceRuleCode } from "../lib/reference-rule-order-days.js";
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

export type WeeklyOrdersQuery = { customerId: bigint; unitId?: bigint; weekStart: string; orderTypeCode?: string };

export async function getWeeklyOrders(query: WeeklyOrdersQuery) {
  const dates = weekDates(query.weekStart);
  const orderTypeCode = query.orderTypeCode ?? "normal";
  const orderType = await prisma.orderType.findUnique({ where: { code: orderTypeCode } });

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
      ...(orderType ? { orderTypeId: orderType.id } : {}),
    },
  });

  const deadlineByDate = await resolveDeadlinesForRange(dates, query.customerId, orderTypeCode);

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
  orderTypeCode?: string;
};

function resolveOrderedBy(ctx: RequestContext): { orderedByType: string; orderedById: bigint | null } {
  if (ctx.userType === "internal") {
    return { orderedByType: "internal", orderedById: ctx.userId ?? null };
  }
  return { orderedByType: "facility", orderedById: ctx.customerUserId ?? null };
}

function resolveChangedBy(ctx: RequestContext): { changedByType: string; changedBy: bigint | null } {
  if (ctx.userType === "internal") {
    return { changedByType: "internal", changedBy: ctx.userId ?? null };
  }
  return { changedByType: "facility", changedBy: ctx.customerUserId ?? null };
}

export async function saveWeeklyOrders(input: SaveWeeklyOrdersInput) {
  const { ctx, customerId, commit, orders } = input;
  const orderTypeCode = input.orderTypeCode ?? "normal";
  if (orders.length === 0) return { saved: 0, cells: [] };

  const uniqueDates = [...new Set(orders.map((o) => o.serviceDate))];
  const deadlines = await resolveDeadlinesForRange(
    uniqueDates.map((d) => toDateOnly(d)),
    customerId,
    orderTypeCode,
  );

  const canBypassDeadline = ctx.permissions.has("*") || ctx.permissions.has("order.update_after_deadline");
  const { orderedByType, orderedById } = resolveOrderedBy(ctx);
  const { changedByType, changedBy } = resolveChangedBy(ctx);
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

      const existing = await tx.mealOrder.findFirst({
        where: { unitId, serviceDate, mealTypeId, menuKindId, orderTypeId },
      });
      const beforeQuantity = existing?.quantity ?? null;

      const orderData = {
        quantity: order.quantity,
        status,
        orderedByType,
        orderedById,
        updatedBy: ctx.userId ?? null,
        ...(commit ? { provisionalQuantity: order.quantity } : {}),
      };

      if (order.version !== undefined && order.version !== null) {
        const updateResult = await tx.mealOrder.updateMany({
          where: { unitId, serviceDate, mealTypeId, menuKindId, orderTypeId, version: order.version },
          data: { ...orderData, version: { increment: 1 } },
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
          create: {
            customerId,
            unitId,
            serviceDate,
            mealTypeId,
            menuKindId,
            orderTypeId,
            quantity: order.quantity,
            status,
            orderedByType,
            orderedById,
            provisionalQuantity: commit ? order.quantity : null,
            createdBy: ctx.userId ?? null,
            updatedBy: ctx.userId ?? null,
          },
          update: { ...orderData, version: { increment: 1 } },
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
              beforeValue: beforeQuantity !== null ? String(beforeQuantity) : null,
              afterValue: String(saved.quantity),
              changedBy,
              changedByType,
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

export type OrderListQuery = {
  customerId?: bigint;
  search?: string;
  serviceDateFrom?: Date;
  serviceDateTo?: Date;
  unitId?: bigint;
  mealTypeId?: bigint;
  menuKindId?: bigint;
  status?: MealOrderStatus;
  page: number;
  perPage: number;
};

export type OrderListItemDto = {
  id: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  unitName: string;
  serviceDate: string;
  mealTypeName: string;
  menuKindName: string;
  currentQuantity: number;
  changedQuantity: number | null;
  reason: string | null;
  version: number;
  status: MealOrderStatus;
};

function mapMealOrderToListItem(
  order: {
    id: bigint;
    quantity: number;
    version: number;
    status: MealOrderStatus;
    serviceDate: Date;
    customerId?: bigint;
    customer?: { customerCode: string; name: string };
    unit: { name: string };
    mealType: { name: string };
    menuKind: { name: string };
  },
  latestChange?: { afterValue: string | null; reason?: string | null } | null,
): OrderListItemDto {
  return {
    id: order.id.toString(),
    ...(order.customerId !== undefined
      ? {
          customerId: order.customerId.toString(),
          customerCode: order.customer?.customerCode,
          customerName: order.customer?.name,
        }
      : {}),
    unitName: order.unit.name,
    serviceDate: order.serviceDate.toISOString().slice(0, 10),
    mealTypeName: order.mealType.name,
    menuKindName: order.menuKind.name,
    currentQuantity: order.quantity,
    changedQuantity: latestChange?.afterValue ? Number(latestChange.afterValue) : null,
    reason: latestChange?.reason ?? null,
    version: order.version,
    status: order.status,
  };
}

export async function getMealOrderById(orderId: bigint): Promise<OrderListItemDto> {
  const order = await prisma.mealOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      unit: true,
      mealType: true,
      menuKind: true,
      changeLogs: { orderBy: { changedAt: "desc" }, take: 1 },
    },
  });
  if (!order) throw new NotFoundError("注文が見つかりません");
  return mapMealOrderToListItem(order, order.changeLogs[0]);
}

export async function listOrders(query: OrderListQuery) {
  const customerFilter =
    query.search
      ? {
          OR: [
            { customerCode: { contains: query.search } },
            { name: { contains: query.search } },
            { shortName: { contains: query.search } },
          ],
        }
      : undefined;

  const where = {
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(customerFilter ? { customer: customerFilter } : {}),
    ...(query.unitId ? { unitId: query.unitId } : {}),
    ...(query.mealTypeId ? { mealTypeId: query.mealTypeId } : {}),
    ...(query.menuKindId ? { menuKindId: query.menuKindId } : {}),
    ...(query.status ? { status: query.status } : { status: { not: "draft" as MealOrderStatus } }),
    ...(query.serviceDateFrom || query.serviceDateTo
      ? {
          serviceDate: {
            ...(query.serviceDateFrom ? { gte: query.serviceDateFrom } : {}),
            ...(query.serviceDateTo ? { lte: query.serviceDateTo } : {}),
          },
        }
      : {}),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.mealOrder.findMany({
      where,
      include: {
        customer: true,
        unit: true,
        mealType: true,
        menuKind: true,
        changeLogs: { orderBy: { changedAt: "desc" }, take: 1 },
      },
      orderBy: [
        { serviceDate: "asc" },
        { customer: { customerCode: "asc" } },
        { unit: { sortOrder: "asc" } },
        { mealType: { sortOrder: "asc" } },
        { menuKind: { sortOrder: "asc" } },
      ],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.mealOrder.count({ where }),
  ]);

  const items = orders.map((order) => mapMealOrderToListItem(order, order.changeLogs[0]));
  return { items, totalCount };
}

export async function exportOrdersCsv(query: Omit<OrderListQuery, "page" | "perPage">): Promise<string> {
  const { items } = await listOrders({ ...query, page: 1, perPage: 100000 });
  const header = ["ユニット", "喫食日", "食事区分", "献立種類", "食数", "ステータス"];
  const lines = items.map((row) =>
    [row.unitName, row.serviceDate, row.mealTypeName, row.menuKindName, String(row.currentQuantity), row.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export type PatchMealOrderInput = {
  ctx: RequestContext;
  orderId: bigint;
  quantity: number;
  version: number;
  reason?: string;
};

export async function patchMealOrder(input: PatchMealOrderInput): Promise<OrderListItemDto> {
  const order = await prisma.mealOrder.findUnique({
    where: { id: input.orderId },
    include: { unit: true, mealType: true, menuKind: true },
  });
  if (!order) {
    throw new NotFoundError("注文が見つかりません");
  }

  if (input.ctx.userType === "facility" && order.customerId !== input.ctx.customerId) {
    throw new ScopeViolationError();
  }
  if (input.ctx.impersonatingCustomerId && order.customerId !== input.ctx.impersonatingCustomerId) {
    throw new ScopeViolationError();
  }

  const deadlines = await resolveDeadlinesForRange([order.serviceDate], order.customerId, "normal");
  const canBypassDeadline = input.ctx.permissions.has("*") || input.ctx.permissions.has("order.update_after_deadline");
  const resolved = deadlines.get(order.serviceDate.toISOString().slice(0, 10));
  const now = Date.now();
  if (resolved && !canBypassDeadline) {
    const pastDeadline = resolved.deadlineAt.getTime() <= now;
    const serviceEnd = new Date(order.serviceDate.getTime());
    serviceEnd.setUTCDate(serviceEnd.getUTCDate() + 1);
    const withinServiceDay = now < serviceEnd.getTime();
    const changeableAfterDeadline =
      (order.status === "confirmed" || order.status === "provisional") && pastDeadline && withinServiceDay;

    if (pastDeadline && !changeableAfterDeadline) {
      throw new DeadlineExceededError(`${order.serviceDate.toISOString().slice(0, 10)} 喫食分は変更できません`, [
        {
          field: "quantity",
          code: "DEADLINE_EXCEEDED",
          message: `${order.serviceDate.toISOString().slice(0, 10)} 喫食分は変更できません`,
          meta: { serviceDate: order.serviceDate.toISOString().slice(0, 10), deadlineAt: resolved.deadlineAt.toISOString() },
        },
      ]);
    }
    if (!pastDeadline && order.status === "draft") {
      // draft before deadline: allowed (provisional edit window)
    }
  }

  const beforeValue = order.quantity;
  const { changedByType, changedBy } = resolveChangedBy(input.ctx);
  const { orderedByType, orderedById } = resolveOrderedBy(input.ctx);
  const updated = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.mealOrder.updateMany({
      where: { id: input.orderId, version: input.version },
      data: {
        quantity: input.quantity,
        status: order.status === "draft" ? "provisional" : order.status,
        orderedByType,
        orderedById,
        version: { increment: 1 },
        updatedBy: input.ctx.userId ?? null,
      },
    });
    if (updateResult.count === 0) {
      const current = await tx.mealOrder.findUnique({ where: { id: input.orderId } });
      throw new VersionConflictError("他のユーザーが同じデータを更新しました", [
        {
          field: "quantity",
          message: `現在の値: ${current?.quantity ?? "不明"} / あなたの入力: ${input.quantity}`,
          meta: { currentValue: current?.quantity, currentVersion: current?.version },
        },
      ]);
    }

    await tx.orderChangeLog.create({
      data: {
        mealOrderId: input.orderId,
        fieldName: "quantity",
        beforeValue: String(beforeValue),
        afterValue: String(input.quantity),
        reason: input.reason ?? null,
        changedBy,
        changedByType,
      },
    });

    return tx.mealOrder.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { unit: true, mealType: true, menuKind: true, changeLogs: { orderBy: { changedAt: "desc" }, take: 1 } },
    });
  });

  await recordAuditLog({
    ctx: input.ctx,
    action: "update",
    entityType: "meal_order",
    entityId: input.orderId,
    before: { quantity: beforeValue, version: input.version },
    after: { quantity: input.quantity, version: updated.version, reason: input.reason ?? null },
  });

  return mapMealOrderToListItem(updated, updated.changeLogs[0]);
}

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

export async function getMealOrderChanges(mealOrderId: bigint) {
  const items = await prisma.orderChangeLog.findMany({
    where: { mealOrderId },
    orderBy: { changedAt: "desc" },
  });
  return items;
}

export type OrderSummaryQuery = {
  customerId: bigint;
  serviceDateFrom: Date;
  serviceDateTo: Date;
  groupBy: "unit" | "day" | "month";
};

export async function getOrderSummary(query: OrderSummaryQuery) {
  const orders = await prisma.mealOrder.findMany({
    where: {
      customerId: query.customerId,
      status: { not: "draft" },
      serviceDate: { gte: query.serviceDateFrom, lte: query.serviceDateTo },
    },
    include: { unit: true, mealType: true, menuKind: true },
    orderBy: [{ serviceDate: "asc" }],
  });

  if (query.groupBy === "unit") {
    const map = new Map<string, { unitId: string; unitName: string; total: number }>();
    for (const o of orders) {
      const key = o.unitId.toString();
      const row = map.get(key) ?? { unitId: key, unitName: o.unit.name, total: 0 };
      row.total += o.quantity;
      map.set(key, row);
    }
    return { groupBy: query.groupBy, rows: [...map.values()] };
  }

  if (query.groupBy === "day") {
    const map = new Map<string, number>();
    for (const o of orders) {
      const key = o.serviceDate.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + o.quantity);
    }
    return {
      groupBy: query.groupBy,
      rows: [...map.entries()].map(([date, total]) => ({ date, total })),
    };
  }

  const map = new Map<string, number>();
  for (const o of orders) {
    const key = o.serviceDate.toISOString().slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + o.quantity);
  }
  return {
    groupBy: query.groupBy,
    rows: [...map.entries()].map(([month, total]) => ({ month, total })),
  };
}

export type UpdateOrderAlertStatusInput = {
  customerId: bigint;
  serviceDate: Date;
  status: string;
  handledBy?: bigint | null;
  note?: string | null;
};

export async function updateOrderAlertStatus(input: UpdateOrderAlertStatusInput) {
  return prisma.orderAlertStatus.upsert({
    where: {
      customerId_serviceDate: { customerId: input.customerId, serviceDate: input.serviceDate },
    },
    create: {
      customerId: input.customerId,
      serviceDate: input.serviceDate,
      status: input.status,
      handledBy: input.handledBy ?? null,
      handledAt: input.status !== "unhandled" ? new Date() : null,
      note: input.note ?? null,
    },
    update: {
      status: input.status,
      handledBy: input.handledBy ?? null,
      handledAt: input.status !== "unhandled" ? new Date() : null,
      note: input.note ?? null,
    },
  });
}

export async function getUnenteredFacilities(query: UnenteredFacilitiesQuery) {
  const customers = await prisma.customer.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      orderSuspensions: true,
      referenceRules: { include: { referenceRule: true } },
    },
  });

  const dates: Date[] = [];
  for (
    let d = new Date(query.serviceDateFrom.getTime());
    d.getTime() <= query.serviceDateTo.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    dates.push(new Date(d.getTime()));
  }

  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];

  const [mealOrders, riceOrders, longHolidays, alertStatuses, previousOrders] = await Promise.all([
    prisma.mealOrder.findMany({
      where: { serviceDate: { gte: dateFrom, lte: dateTo } },
      select: { customerId: true, serviceDate: true, status: true },
    }),
    prisma.riceOrder.findMany({
      where: { serviceDate: { gte: dateFrom, lte: dateTo } },
      select: { customerId: true, serviceDate: true },
    }),
    prisma.longHoliday.findMany({
      where: {
        startDate: { lte: dateTo },
        endDate: { gte: dateFrom },
      },
    }),
    prisma.orderAlertStatus.findMany({
      where: { serviceDate: { gte: dateFrom, lte: dateTo } },
    }),
    prisma.mealOrder.findMany({
      where: {
        serviceDate: { lt: dateFrom },
        status: { not: "draft" },
      },
      select: { customerId: true, serviceDate: true, quantity: true },
      orderBy: [{ serviceDate: "desc" }],
    }),
  ]);

  const mealByCustomerDate = new Map<string, { count: number; hasNonDraft: boolean }>();
  for (const o of mealOrders) {
    const key = `${o.customerId}:${o.serviceDate.toISOString().slice(0, 10)}`;
    const cur = mealByCustomerDate.get(key) ?? { count: 0, hasNonDraft: false };
    cur.count += 1;
    if (o.status !== "draft") cur.hasNonDraft = true;
    mealByCustomerDate.set(key, cur);
  }

  const riceByCustomerDate = new Set<string>();
  for (const o of riceOrders) {
    riceByCustomerDate.add(`${o.customerId}:${o.serviceDate.toISOString().slice(0, 10)}`);
  }

  const alertStatusMap = new Map(
    alertStatuses.map((s) => [`${s.customerId}:${s.serviceDate.toISOString().slice(0, 10)}`, s.status]),
  );

  const previousByCustomer = new Map<string, { lastServiceDate: string; totalQuantity: number }>();
  for (const o of previousOrders) {
    const cid = o.customerId.toString();
    if (!previousByCustomer.has(cid)) {
      previousByCustomer.set(cid, {
        lastServiceDate: o.serviceDate.toISOString().slice(0, 10),
        totalQuantity: o.quantity,
      });
    } else {
      const cur = previousByCustomer.get(cid)!;
      if (cur.lastServiceDate === o.serviceDate.toISOString().slice(0, 10)) {
        cur.totalQuantity += o.quantity;
      }
    }
  }

  const deadlineByCustomer = new Map<string, Map<string, { deadlineAt: Date } | null>>();
  for (const customer of customers) {
    const resolved = await resolveDeadlinesForRange(dates, customer.id, "normal");
    deadlineByCustomer.set(customer.id.toString(), resolved);
  }

  const alerts: unknown[] = [];
  const excluded = { contractEnded: 0, orderSuspended: 0, longHoliday: 0, weekdayNotApplicable: 0 };

  for (const customer of customers) {
    const customerDeadlines = deadlineByCustomer.get(customer.id.toString()) ?? new Map();
    for (const date of dates) {
      const dateKey = date.toISOString().slice(0, 10);
      if (customer.contractStartDate.getTime() > date.getTime()) continue;
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
      const onHoliday = longHolidays.some(
        (h) =>
          h.startDate.getTime() <= date.getTime() &&
          h.endDate.getTime() >= date.getTime() &&
          (h.customerId === null || h.customerId === customer.id),
      );
      if (onHoliday) {
        excluded.longHoliday += 1;
        continue;
      }

      const ruleCode = getActiveReferenceRuleCode(customer.referenceRules, date);
      if (!isOrderDayForReferenceRuleCode(ruleCode, date)) {
        excluded.weekdayNotApplicable += 1;
        continue;
      }

      const key = `${customer.id}:${dateKey}`;
      const meal = mealByCustomerDate.get(key);
      const hasMeal = meal && meal.count > 0 && meal.hasNonDraft;
      const hasRice = riceByCustomerDate.has(key);

      if (!hasMeal) {
        const resolved = customerDeadlines.get(dateKey);
        const missingTypes = ["meal_count", ...(hasRice ? [] : ["rice"])];
        alerts.push({
          customerId: customer.id,
          customerCode: customer.customerCode,
          customerName: customer.name,
          serviceDate: dateKey,
          missingTypes,
          previousOrderSummary: previousByCustomer.get(customer.id.toString()) ?? null,
          alertStatus: alertStatusMap.get(key) ?? "unhandled",
          deadlineAt: resolved?.deadlineAt?.toISOString() ?? null,
        });
      }
    }
  }

  return { alerts, excluded };
}
