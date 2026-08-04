"use client";

import { AlertTriangle, Hand, RotateCcw } from "lucide-react";
import { cn, formatMonthDay, formatNumber } from "@/lib/utils";
import type { ScheduleResponse } from "@/lib/types";

const LEGEND = [
  { key: "auto", icon: RotateCcw, label: "自動調整", className: "text-danger" },
  { key: "manual", icon: Hand, label: "手動更新", className: "text-primary" },
  { key: "shortage", icon: AlertTriangle, label: "不足", className: "text-warning" },
] as const;

export function ScheduleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-white px-3 py-2 text-[12px] text-muted">
      {LEGEND.map((l) => (
        <span key={l.key} className="inline-flex items-center gap-1.5">
          <l.icon className={cn("h-3.5 w-3.5", l.className)} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

export function ScheduleGrid({
  data,
  mode,
  onCellEdit,
}: {
  data: ScheduleResponse;
  mode: "detail" | "simple";
  onCellEdit: (scheduleId: string, patch: { orderQty?: string; actualStock?: string }, version: number) => void;
}) {
  return (
    <div className="dense-grid overflow-auto rounded-lg border border-border bg-white">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
          <tr>
            <th className="w-48 px-3 py-2 text-[11px] font-medium text-muted">商品名</th>
            <th className="w-20 px-2 py-2 text-right text-[11px] font-medium text-muted">合計発注量</th>
            <th className="w-14 px-2 py-2 text-[11px] font-medium text-muted">単位</th>
            {data.dates.map((d) => (
              <th key={d.date} className="px-2 py-2 text-center text-[11px] font-medium text-muted">
                <div>{formatMonthDay(d.date)}</div>
                <div>{d.weekday} 納品</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <tr>
              <td colSpan={3 + data.dates.length} className="px-3 py-10 text-center text-[13px] text-muted">
                該当する商品がありません
              </td>
            </tr>
          ) : (
            data.items.map((item) => (
              <tr key={item.stockItemId} className="border-b border-border/60">
                <td className="px-3 py-1.5 font-medium text-text">{item.name}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(item.totalOrderQty)}</td>
                <td className="px-2 py-1.5 text-muted">{item.unit}</td>
                {data.dates.map((d) => {
                  const cell = item.cells.find((c) => c.deliveryDate === d.date);
                  if (!cell) {
                    return <td key={d.date} className="px-2 py-1.5 text-center text-muted/40">—</td>;
                  }
                  return (
                    <td key={d.date} className="px-1 py-1.5 align-top">
                      <div
                        className={cn(
                          "flex flex-col gap-0.5 rounded-sm px-1.5 py-1",
                          cell.isShortage && "bg-warning/10",
                        )}
                      >
                        {mode === "detail" ? (
                          <>
                            <Row label="必要量" value={formatNumber(cell.requiredQty)} />
                            <Row label="見込在庫" value={formatNumber(cell.expectedStock)} />
                          </>
                        ) : null}
                        <div className="flex items-center justify-end gap-1">
                          {cell.isShortage ? (
                            <AlertTriangle className="h-3 w-3 text-warning" aria-label="不足" />
                          ) : null}
                          {cell.adjustSource === "manual" ? (
                            <Hand className="h-3 w-3 text-primary" aria-label="手動更新" />
                          ) : (
                            <RotateCcw className="h-3 w-3 text-danger" aria-label="自動調整" />
                          )}
                          <input
                            type="text"
                            defaultValue={cell.orderQty}
                            onBlur={(e) =>
                              onCellEdit(cell.id, { orderQty: e.target.value }, cell.version)
                            }
                            className={cn(
                              "h-6 w-16 rounded-sm border border-transparent bg-transparent text-right text-[12px] tabular-nums outline-none transition-colors hover:border-border focus:border-primary/60 focus:bg-white focus:ring-1 focus:ring-primary/20",
                              cell.adjustSource === "manual" ? "text-primary" : "text-danger",
                            )}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1 text-muted">
                          <span className="text-[10px]">実在庫</span>
                          <input
                            type="text"
                            defaultValue={cell.actualStock ?? ""}
                            placeholder="—"
                            onBlur={(e) =>
                              onCellEdit(cell.id, { actualStock: e.target.value }, cell.version)
                            }
                            className="h-6 w-14 rounded-sm border border-transparent bg-transparent text-right text-[12px] tabular-nums text-text outline-none transition-colors hover:border-border focus:border-primary/60 focus:bg-white focus:ring-1 focus:ring-primary/20"
                          />
                        </div>
                        {cell.unenteredCustomerCodes.length > 0 ? (
                          <p
                            className="truncate text-[10px] text-warning"
                            title={`仮注文未入力: ${cell.unenteredCustomerCodes.join(", ")}`}
                          >
                            未入力 {cell.unenteredCustomerCodes.length}件
                          </p>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[10px] text-muted">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
