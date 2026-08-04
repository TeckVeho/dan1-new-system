"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/badge";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { getOrders } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { OrderListItem } from "@/lib/types";

type ViewMode = "detail" | "unit" | "day";

const VIEW_LABEL: Record<ViewMode, string> = {
  detail: "明細一覧",
  unit: "ユニット別集計",
  day: "日別集計",
};

function monthRange(base: Date) {
  const from = new Date(base.getFullYear(), base.getMonth(), 1);
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function OrderHistoryPage() {
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("detail");
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = monthRange(monthAnchor);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({ serviceDateFrom: from, serviceDateTo: to, page, perPage: pageSize });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [from, to, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const unitSummary = summarizeByUnit(rows);
  const daySummary = summarizeByDay(rows);

  const detailColumns: DataTableColumn<OrderListItem>[] = [
    { key: "unitName", header: "ユニット" },
    { key: "serviceDate", header: "喫食日" },
    { key: "mealTypeName", header: "食事区分" },
    { key: "menuKindName", header: "献立種類" },
    {
      key: "currentQuantity",
      header: "食数",
      className: "text-right tabular-nums",
      render: (row) => formatNumber(row.currentQuantity),
    },
  ];

  return (
    <div>
      <PageHeader
        title="注文履歴"
        description="確定済みの注文を明細・集計・カレンダーで確認できます"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <Copy className="h-3.5 w-3.5" />
              コピー
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              印刷する
            </Button>
          </>
        }
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            前月
          </Button>
          <span className="px-2 text-[13px] font-medium text-text">
            {monthAnchor.getFullYear()}年{monthAnchor.getMonth() + 1}月分を表示する
          </span>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            翌月
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(VIEW_LABEL) as ViewMode[]).map((v) => (
            <FilterChip key={v} active={view === v} onClick={() => setView(v)} label={VIEW_LABEL[v]} />
          ))}
        </div>
      </div>

      {view === "detail" ? (
        <>
          <DataTable
            columns={detailColumns}
            rows={rows}
            getRowKey={(row) => row.id}
            loading={loading}
            emptyMessage="対象期間の注文履歴がありません"
          />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            pageSizeOptions={[10, 30, 60, 100]}
          />
        </>
      ) : view === "unit" ? (
        <div className="overflow-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-full border-collapse text-left text-[13px]">
            <thead className="border-b border-border bg-surface/95">
              <tr className="text-[12px] text-muted">
                <th className="px-3 py-2 font-medium">ユニット</th>
                <th className="px-3 py-2 text-right font-medium">期間合計</th>
              </tr>
            </thead>
            <tbody>
              {unitSummary.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-muted">
                    データがありません
                  </td>
                </tr>
              ) : (
                unitSummary.map((u) => (
                  <tr key={u.unitName} className="border-b border-border/80 hover:bg-bg">
                    <td className="px-3 py-2.5">{u.unitName}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(u.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-full border-collapse text-left text-[13px]">
            <thead className="border-b border-border bg-surface/95">
              <tr className="text-[12px] text-muted">
                <th className="px-3 py-2 font-medium">喫食日</th>
                <th className="px-3 py-2 text-right font-medium">合計食数</th>
              </tr>
            </thead>
            <tbody>
              {daySummary.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-muted">
                    データがありません
                  </td>
                </tr>
              ) : (
                daySummary.map((d) => (
                  <tr key={d.serviceDate} className="border-b border-border/80 hover:bg-bg">
                    <td className="px-3 py-2.5">{d.serviceDate}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(d.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function summarizeByUnit(rows: OrderListItem[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.unitName, (map.get(r.unitName) ?? 0) + r.currentQuantity);
  }
  return [...map.entries()].map(([unitName, total]) => ({ unitName, total }));
}

function summarizeByDay(rows: OrderListItem[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.serviceDate, (map.get(r.serviceDate) ?? 0) + r.currentQuantity);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([serviceDate, total]) => ({ serviceDate, total }));
}
