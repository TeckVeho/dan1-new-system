"use client";

import { cn, formatMonthDay } from "@/lib/utils";
import type { WeeklyOrderRow, WeeklyOrdersResponse } from "@/lib/types";

export type CellEdit = { quantity: number; version: number | null };
export type CellKey = string;

export function cellKey(row: WeeklyOrderRow, date: string) {
  return `${row.unitId}:${row.mealTypeId}:${row.menuKindId}:${date}`;
}

function rowLabel(row: WeeklyOrderRow) {
  if (row.swallowCategory) return row.swallowCategory.name;
  return row.menuKindName;
}

/**
 * 週間注文入力の高密度グリッド（07_screen_spec.md SC-102）。
 * ユニット×食事区分×献立種類(嚥下食含む)の行を、行データの並び順のままレンダリングする。
 */
export function WeeklyOrderGrid({
  data,
  edits,
  onCellChange,
  readOnly,
}: {
  data: WeeklyOrdersResponse;
  edits: Map<CellKey, CellEdit>;
  onCellChange: (row: WeeklyOrderRow, date: string, cellEdit: CellEdit, value: number) => void;
  readOnly?: boolean;
}) {
  let lastUnit: string | null = null;
  let lastMealType: string | null = null;

  return (
    <div className="dense-grid overflow-auto rounded-lg border border-border bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="sticky top-0 z-10 border-b border-border bg-primary-light">
          <tr>
            <th className="sticky left-0 z-20 w-44 border-r border-border bg-primary-light px-3 py-2 text-[11px] font-semibold text-text">
              項目
            </th>
            {data.dates.map((d) => (
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
          {data.rows.map((row, rowIndex) => {
            const showUnit = row.unitId !== lastUnit;
            const showMealType = showUnit || row.mealTypeId !== lastMealType;
            lastUnit = row.unitId;
            lastMealType = row.mealTypeId;
            const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-bg/60";

            return (
              <tr
                key={`${row.unitId}-${row.mealTypeId}-${row.menuKindId}`}
                className={cn("border-b border-border hover:bg-primary/[0.04]", rowBg)}
              >
                <td
                  className={cn(
                    "sticky left-0 z-[1] whitespace-nowrap border-r border-border px-3 py-1.5 text-[12px]",
                    rowBg,
                  )}
                >
                  {showUnit ? <span className="mr-1 font-semibold text-text">■ {row.unitName}</span> : null}
                  {showMealType ? <span className="text-muted">{row.mealTypeName}</span> : null}
                  <span className="ml-2 text-text">{rowLabel(row)}</span>
                </td>
                {data.dates.map((d) => {
                  const cell = row.cells.find((c) => c.date === d.date);
                  const key = cellKey(row, d.date);
                  const edit = edits.get(key);
                  const value = edit ? edit.quantity : cell?.quantity ?? null;
                  const editable = d.editable && !readOnly;
                  const dirty = edits.has(key);

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
                            { quantity: num, version: cell?.version ?? null },
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
                        )}
                        title={!d.editable ? `締切: ${d.deadlineAt}` : undefined}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t-2 border-border bg-primary-light font-medium">
            <td className="sticky left-0 z-[1] border-r border-border bg-primary-light px-3 py-1.5 text-[12px] font-semibold text-text">
              合計
            </td>
            {data.dates.map((d) => {
              const total = data.rows.reduce((sum, row) => {
                const key = cellKey(row, d.date);
                const edit = edits.get(key);
                if (edit) return sum + edit.quantity;
                const cell = row.cells.find((c) => c.date === d.date);
                return sum + (cell?.quantity ?? 0);
              }, 0);
              return (
                <td key={d.date} className="px-2 py-1.5 text-center text-[12px] tabular-nums font-semibold text-text">
                  {total}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
