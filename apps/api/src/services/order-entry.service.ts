import { prisma } from "@dan1/database";
import { DeadlineExceededError, VersionConflictError } from "../lib/errors.js";
import type { RequestContext } from "../types/context.js";
import { getWeeklyOrders, saveWeeklyOrders } from "./orders.service.js";
import {
  createAllergenOrder,
  getAllergenOrderOptions,
  getRiceOrders,
  listAllergenOrders,
  saveRiceOrders,
  updateAllergenOrder,
  type RiceOrderCell,
} from "./rice-allergen.service.js";
import { getOrderWindows } from "./order-windows.service.js";

export type OrderGridRowType = "meal" | "allergen" | "rice";

export type OrderEntryCell = {
  date: string;
  orderId: string | null;
  quantity: number | null;
  status: string | null;
  version: number | null;
};

export type OrderEntryRow = {
  rowType: OrderGridRowType;
  rowKey: string;
  unitId: string;
  unitName: string;
  unitSortOrder: number;
  mealTypeId?: string;
  mealTypeName?: string;
  mealTypeSortOrder?: number;
  menuKindId?: string;
  menuKindName?: string;
  menuKindSortOrder?: number;
  swallowCategory?: { id: string; code: string; name: string; sortOrder: number } | null;
  allergenTypeId?: string;
  allergenTypeCode?: string;
  allergenTypeName?: string;
  riceType?: string;
  riceTypeName?: string;
  cells: OrderEntryCell[];
};

export type OrderEntryResponse = {
  weekStart: string;
  dates: Array<{ date: string; weekday: string; editable: boolean; deadlineAt: string | null }>;
  rows: OrderEntryRow[];
  riceTypes: Array<{ code: string; name: string; sortOrder: number }>;
  allergenOptions: Array<{ id: string; code: string; name: string }>;
  windowInfo: { deadlineAt: string; remainingSeconds: number } | null;
};

function toId(value: bigint | number | string): string {
  return String(value);
}

export async function getOrderEntry(query: { customerId: bigint; weekStart: string }): Promise<OrderEntryResponse> {
  const weekEnd = new Date(query.weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [weekly, riceOrders, allergenOrders, riceTypes, allergenOpts, windows] = await Promise.all([
    getWeeklyOrders({ customerId: query.customerId, weekStart: query.weekStart }),
    getRiceOrders(query.customerId, new Date(query.weekStart), weekEnd),
    listAllergenOrders(query.customerId, new Date(query.weekStart), weekEnd),
    prisma.riceType.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    }),
    getAllergenOrderOptions(query.customerId),
    getOrderWindows({
      customerId: query.customerId,
      orderType: "provisional",
      from: query.weekStart,
      to: weekEndStr,
    }),
  ]);

  const units = await prisma.unit.findMany({
    where: { customerId: query.customerId, deletedAt: null, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const dates = weekly.dates as OrderEntryResponse["dates"];
  const rows: OrderEntryRow[] = [];

  const allergenByRow = new Map<string, (typeof allergenOrders)[number][]>();
  for (const order of allergenOrders) {
    const key = `${toId(order.unitId)}:${toId(order.allergenTypeId)}`;
    const list = allergenByRow.get(key) ?? [];
    list.push(order);
    allergenByRow.set(key, list);
  }

  for (const unit of units) {
    const unitId = toId(unit.id);

    for (const row of weekly.rows as Array<{
      unitId: bigint;
      unitName: string;
      unitSortOrder: number;
      mealTypeId: bigint;
      mealTypeName: string;
      mealTypeSortOrder: number;
      menuKindId: bigint;
      menuKindName: string;
      menuKindSortOrder: number;
      swallowCategory: OrderEntryRow["swallowCategory"];
      cells: OrderEntryCell[];
    }>) {
      if (toId(row.unitId) !== unitId) continue;
      rows.push({
        rowType: "meal",
        rowKey: `meal:${row.unitId}:${row.mealTypeId}:${row.menuKindId}`,
        unitId: toId(row.unitId),
        unitName: row.unitName,
        unitSortOrder: row.unitSortOrder,
        mealTypeId: toId(row.mealTypeId),
        mealTypeName: row.mealTypeName,
        mealTypeSortOrder: row.mealTypeSortOrder,
        menuKindId: toId(row.menuKindId),
        menuKindName: row.menuKindName,
        menuKindSortOrder: row.menuKindSortOrder,
        swallowCategory: row.swallowCategory ?? null,
        cells: row.cells,
      });
    }

    for (const [key, orders] of allergenByRow) {
      if (!key.startsWith(`${unitId}:`)) continue;
      const first = orders[0];
      rows.push({
        rowType: "allergen",
        rowKey: `allergen:${key}`,
        unitId,
        unitName: unit.name,
        unitSortOrder: unit.sortOrder,
        allergenTypeId: toId(first.allergenTypeId),
        allergenTypeCode: first.allergenType?.code ?? "",
        allergenTypeName: first.allergenType?.name ?? "",
        cells: dates.map((d) => {
          const match = orders.find((o) => o.serviceDate.toISOString().slice(0, 10) === d.date);
          return {
            date: d.date,
            orderId: match ? toId(match.id) : null,
            quantity: match?.quantity ?? null,
            status: match?.status ?? null,
            version: match?.version ?? null,
          };
        }),
      });
    }

    for (const riceType of riceTypes) {
      const unitRice = riceOrders.filter((o) => toId(o.unitId) === unitId && o.riceType === riceType.code);
      rows.push({
        rowType: "rice",
        rowKey: `rice:${unitId}:${riceType.code}`,
        unitId,
        unitName: unit.name,
        unitSortOrder: unit.sortOrder,
        riceType: riceType.code,
        riceTypeName: riceType.name,
        cells: dates.map((d) => {
          const match = unitRice.find((o) => o.serviceDate.toISOString().slice(0, 10) === d.date);
          return {
            date: d.date,
            orderId: match ? toId(match.id) : null,
            quantity: match?.quantity ?? null,
            status: match?.status ?? null,
            version: match?.version ?? null,
          };
        }),
      });
    }
  }

  const next = windows.nextDeadline;
  return {
    weekStart: weekly.weekStart as string,
    dates,
    rows,
    riceTypes: riceTypes.map((r: { code: string; name: string; sortOrder: number }) => ({
      code: r.code,
      name: r.name,
      sortOrder: r.sortOrder,
    })),
    allergenOptions: allergenOpts.allergens.map((a: { allergenType: { id: bigint; code: string; name: string } }) => ({
      id: toId(a.allergenType.id),
      code: a.allergenType.code,
      name: a.allergenType.name,
    })),
    windowInfo: {
      deadlineAt: next.deadlineAt,
      remainingSeconds: next.remainingSeconds,
    },
  };
}

export type OrderEntrySaveCell = {
  rowType: OrderGridRowType;
  rowKey: string;
  unitId: string;
  serviceDate: string;
  quantity: number;
  version: number | null;
  mealTypeId?: string;
  menuKindId?: string;
  allergenTypeId?: string;
  riceType?: string;
  orderId?: string | null;
};

export type OrderEntrySaveFailure = {
  rowType: OrderGridRowType;
  key: string;
  code: string;
  message: string;
};

export type OrderEntrySaveResult = {
  saved: number;
  failed: OrderEntrySaveFailure[];
  mealTotal: number;
  allergenTotal: number;
  riceTotal: number;
};

export async function saveOrderEntry(
  ctx: RequestContext,
  customerId: bigint,
  commit: boolean,
  cells: OrderEntrySaveCell[],
): Promise<OrderEntrySaveResult> {
  if (cells.length === 0) return { saved: 0, failed: [], mealTotal: 0, allergenTotal: 0, riceTotal: 0 };

  const normalOrderType = await prisma.orderType.findUnique({ where: { code: "normal" } });
  if (!normalOrderType) throw new Error("order type normal is not configured");

  const mealCells = cells.filter((c) => c.rowType === "meal");
  const riceCells = cells.filter((c) => c.rowType === "rice");
  const allergenCells = cells.filter((c) => c.rowType === "allergen");

  const failed: OrderEntrySaveFailure[] = [];
  let saved = 0;

  for (const cell of mealCells) {
    if (!cell.mealTypeId || !cell.menuKindId) continue;
    try {
      await saveWeeklyOrders({
        ctx,
        customerId,
        commit,
        orders: [
          {
            unitId: cell.unitId,
            serviceDate: cell.serviceDate,
            mealTypeId: cell.mealTypeId,
            menuKindId: cell.menuKindId,
            orderTypeId: normalOrderType.id.toString(),
            quantity: cell.quantity,
            version: cell.version,
          },
        ],
      });
      saved += 1;
    } catch (error) {
      failed.push(mapSaveError("meal", cellKey(cell), error));
    }
  }

  for (const cell of riceCells) {
    if (!cell.riceType) continue;
    const active = await prisma.riceType.findFirst({
      where: { code: cell.riceType, isActive: true, deletedAt: null },
    });
    if (!active) {
      failed.push({
        rowType: "rice",
        key: cellKey(cell),
        code: "INVALID_RICE_TYPE",
        message: `未登録の混ぜご飯種別です: ${cell.riceType}`,
      });
      continue;
    }
    try {
      await saveRiceOrders(ctx, customerId, commit, [
        {
          unitId: cell.unitId,
          serviceDate: cell.serviceDate,
          riceType: cell.riceType,
          quantity: cell.quantity,
          version: cell.version,
        } satisfies RiceOrderCell,
      ]);
      saved += 1;
    } catch (error) {
      failed.push(mapSaveError("rice", cellKey(cell), error));
    }
  }

  for (const cell of allergenCells) {
    if (!cell.allergenTypeId) continue;
    try {
      if (cell.orderId) {
        await updateAllergenOrder({
          ctx,
          id: BigInt(cell.orderId),
          quantity: cell.quantity,
          version: cell.version ?? 0,
        });
      } else if (cell.quantity > 0) {
        await createAllergenOrder({
          ctx,
          customerId,
          unitId: BigInt(cell.unitId),
          serviceDate: new Date(cell.serviceDate),
          allergenTypeId: BigInt(cell.allergenTypeId),
          quantity: cell.quantity,
        });
      }
      saved += 1;
    } catch (error) {
      failed.push(mapSaveError("allergen", cellKey(cell), error));
    }
  }

  const mealTotal = mealCells.reduce((s, c) => s + c.quantity, 0);
  const allergenTotal = allergenCells.reduce((s, c) => s + c.quantity, 0);
  const riceTotal = riceCells.reduce((s, c) => s + c.quantity, 0);

  return { saved, failed, mealTotal, allergenTotal, riceTotal };
}

function cellKey(cell: OrderEntrySaveCell): string {
  return `${cell.rowType}:${cell.unitId}:${cell.serviceDate}:${cell.mealTypeId ?? cell.allergenTypeId ?? cell.riceType ?? ""}`;
}

function mapSaveError(rowType: OrderGridRowType, key: string, error: unknown): OrderEntrySaveFailure {
  if (error instanceof DeadlineExceededError) {
    return { rowType, key, code: "DEADLINE_EXCEEDED", message: error.message };
  }
  if (error instanceof VersionConflictError) {
    return { rowType, key, code: "VERSION_CONFLICT", message: error.message };
  }
  return {
    rowType,
    key,
    code: "SAVE_FAILED",
    message: error instanceof Error ? error.message : "保存に失敗しました",
  };
}

export async function addAllergenEntryRow(
  ctx: RequestContext,
  customerId: bigint,
  weekStart: string,
  unitId: string,
  allergenTypeId: string,
): Promise<OrderEntryResponse> {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const existing = await listAllergenOrders(customerId, new Date(weekStart), weekEnd, BigInt(unitId));
  const duplicate = existing.some((o) => toId(o.allergenTypeId) === allergenTypeId);
  if (!duplicate) {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      return d;
    });
    await createAllergenOrder({
      ctx,
      customerId,
      unitId: BigInt(unitId),
      serviceDate: dates[0],
      allergenTypeId: BigInt(allergenTypeId),
      quantity: 0,
    });
  }
  return getOrderEntry({ customerId, weekStart });
}
