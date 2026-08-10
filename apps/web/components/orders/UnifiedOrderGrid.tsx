"use client";

import { cn, formatMonthDay } from "@/lib/utils";
import type { OrderEntryRow, WeeklyOrderDate } from "@/lib/types";

export type EntryCellEdit = { quantity: number; version: number | null; orderId?: string | null };
export type EntryCellKey = string;

export function entryCellKey(row: OrderEntryRow, date: string): EntryCellKey {
  return `${row.rowKey}:${date}`;
}

function rowLabel(row: OrderEntryRow): string {
  if (row.rowType === "allergen") {
    return `${row.allergenTypeCode ?? ""} ${row.allergenTypeName ?? "アレルギー"}`.trim();
  }
  if (row.rowType === "rice") {
    return row.riceTypeName ?? row.riceType ?? "混ぜご飯";
  }
  if (row.swallowCategory) return row.swallowCategory.name;
  return row.menuKindName ?? "";
}

type Props = {
  dates: WeeklyOrderDate[];
  rows: OrderEntryRow[];
  edits: Map<EntryCellKey, EntryCellEdit>;
  failedKeys: Set<EntryCellKey>;
  onCellChange: (row: OrderEntryRow, date: string, cellEdit: EntryCellEdit, value: number) => void;
  onAddAllergen?: (unitId: string) => void;
  readOnly?: boolean;
};

export function UnifiedOrderGrid({
  dates,
  rows,
  edits,
  failedKeys,
  onCellChange,
  onAddAllergen,
  readOnly,
}: Props) {
  let lastUnit: string | null = null;
  let lastMealType: string | null = null;
  let lastSection: OrderEntryRow["rowType"] | null = null;

  return (
    <div className="dense-grid overflow-auto rounded-lg border border-border bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="sticky top-0 z-10 border-b border-border bg-primary-light">
          <tr>
            <th className="sticky left-0 z-20 w-52 border-r border-border bg-primary-light px-3 py-2 text-[11px] font-semibold text-text">
              項目
            </th>
            {dates.map((d) => (
              <th
                key={d.date}
                className={cn(
                  "px-2 py-2 text-center text-[11px] font-semibold text-text",
                  !d.editable && "text-muted",
                )}
              >
                <div>{formatMonthDay(d.date)}</div>
                <div className="text-[10px] font-medium text-muted">{d.weekday}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const showUnit = row.unitId !== lastUnit;
            const showMealType = row.rowType === "meal" && (showUnit || row.mealTypeId !== lastMealType);
            const showSection =
              showUnit ||
              (row.rowType !== lastSection && row.rowType !== "meal") ||
              (row.rowType === "allergen" && lastSection !== "allergen");
            lastUnit = row.unitId;
            lastMealType = row.mealTypeId ?? null;
            lastSection = row.rowType;
            const rowBg =
              row.rowType === "rice"
                ? "bg-amber-50/60"
                : row.rowType === "allergen"
                  ? "bg-sky-50/40"
                  : rowIndex % 2 === 0
                    ? "bg-white"
                    : "bg-bg/60";

            return (
              <tr key={row.rowKey} className={cn("border-b border-border hover:bg-primary/[0.04]", rowBg)}>
                <td
                  className={cn(
                    "sticky left-0 z-[1] whitespace-nowrap border-r border-border px-3 py-1.5 text-[12px]",
                    rowBg,
                  )}
                >
                  {showUnit ? (
                    <span className="mr-1 font-semibold text-text">■ {row.unitName}</span>
                  ) : null}
                  {showSection && row.rowType === "allergen" ? (
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                      アレルギー（食数に追加）
                    </div>
                  ) : null}
                  {showSection && row.rowType === "rice" ? (
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      混ぜご飯（単位: 合）
                    </div>
                  ) : null}
                  {showMealType ? <span className="text-muted">{row.mealTypeName}</span> : null}
                  <span className={cn("ml-2 text-text", row.rowType !== "meal" && "ml-0 block")}>{rowLabel(row)}</span>
                  {showUnit && onAddAllergen ? (
                    <button
                      type="button"
                      onClick={() => onAddAllergen(row.unitId)}
                      className="mt-1 block text-[11px] text-primary hover:underline"
                    >
                      ＋アレルギーを追加
                    </button>
                  ) : null}
                </td>
                {dates.map((d) => {
                  const cell = row.cells.find((c) => c.date === d.date);
                  const key = entryCellKey(row, d.date);
                  const edit = edits.get(key);
                  const value = edit ? edit.quantity : cell?.quantity ?? null;
                  const editable = d.editable && !readOnly;
                  const dirty = edits.has(key);
                  const failed = failedKeys.has(key);

                  return (
                    <td key={d.date} className="p-0.5 text-center">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        disabled={!editable}
                        value={value ?? ""}
                        placeholder={value === null ? "" : undefined}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const num = raw === "" ? 0 : Number(raw);
                          onCellChange(
                            row,
                            d.date,
                            {
                              quantity: num,
                              version: cell?.version ?? null,
                              orderId: cell?.orderId ?? null,
                            },
                            num,
                          );
                        }}
                        className={cn(
                          "h-7 w-12 rounded-sm border text-center text-[12px] tabular-nums outline-none transition-colors",
                          editable
                            ? "border-border bg-white text-text hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary/20"
                            : "cursor-not-allowed border-transparent bg-transparent text-muted/50",
                          value === null && editable && "bg-bg text-muted",
                          dirty && "border-primary bg-accent-light font-medium text-primary",
                          failed && "border-danger bg-danger/5",
                        )}
                        title={failed ? "保存に失敗しました" : !d.editable ? `締切: ${d.deadlineAt}` : undefined}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t-2 border-border bg-primary-light font-medium">
            <td className="sticky left-0 z-[1] border-r border-border bg-primary-light px-3 py-1.5 text-[12px] font-semibold text-text">
              食数合計
            </td>
            {dates.map((d) => {
              const mealTotal = rows
                .filter((r) => r.rowType === "meal" || r.rowType === "allergen")
                .reduce((sum, row) => {
                  const key = entryCellKey(row, d.date);
                  const edit = edits.get(key);
                  if (edit) return sum + edit.quantity;
                  const cell = row.cells.find((c) => c.date === d.date);
                  return sum + (cell?.quantity ?? 0);
                }, 0);
              return (
                <td key={d.date} className="px-2 py-1.5 text-center text-[12px] tabular-nums font-semibold text-text">
                  {mealTotal}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
