"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionNavTabs } from "@/components/layout/SectionNavTabs";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { generateReport, getMealCountSyncHistory, postMealCountSync } from "@/lib/api";
import { addDays, formatDateTime, toWeekStart } from "@/lib/utils";
import type { MealCountSyncHistoryItem } from "@/lib/types";

const STATUS_LABEL: Record<
  MealCountSyncHistoryItem["status"],
  { label: string; variant: "muted" | "primary" | "success" | "danger" }
> = {
  pending: { label: "待機中", variant: "muted" },
  running: { label: "実行中", variant: "primary" },
  completed: { label: "完了", variant: "success" },
  failed: { label: "失敗", variant: "danger" },
  cancelled: { label: "取消", variant: "muted" },
};

function MealCountSyncContent() {
  const [dateFrom, setDateFrom] = useState(() => toWeekStart(new Date()));
  const [dateTo, setDateTo] = useState(() => addDays(toWeekStart(new Date()), 6));
  const [rows, setRows] = useState<MealCountSyncHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMealCountSyncHistory({ page, perPage: pageSize });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await postMealCountSync({ dateFrom, dateTo });
      setMessage(`同期を登録しました（ジョブID: ${res.jobId}）`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "同期の登録に失敗しました");
    } finally {
      setSyncing(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await generateReport("meal_count_sync", { dateFrom, dateTo, format: "csv" });
      setMessage(`CSV出力を開始しました（ジョブID: ${res.jobId}）`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV出力に失敗しました");
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn<MealCountSyncHistoryItem>[] = [
    {
      key: "status",
      header: "状態",
      render: (row) => {
        const status = STATUS_LABEL[row.status];
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: "period",
      header: "対象期間",
      render: (row) => `${row.dateFrom} 〜 ${row.dateTo}`,
    },
    { key: "totalMeals", header: "食数", render: (row) => `${row.totalMeals} 食` },
    { key: "customerCount", header: "施設数", render: (row) => `${row.customerCount} 件` },
    { key: "referenceCount", header: "反映件数", render: (row) => `${row.referenceCount} 件` },
    { key: "executedBy", header: "実行者" },
    { key: "createdAt", header: "実行日時", render: (row) => formatDateTime(row.createdAt) },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link href={`/admin/jobs/${row.id}`} className="text-[12px] text-primary hover:underline">
          詳細
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="食数データの同期"
        description="注文の食数を発注側へ反映します。期間の制限はありません"
      />
      <SectionNavTabs groupId="procurement-adjustments" />

      <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-text">同期の実行</h2>
        <p className="mt-1 text-[12px] text-muted">
          確定・仮確定の注文食数を集計し、発注スケジュールの参照データへ反映します
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Input label="対象期間（開始）" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="対象期間（終了）" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="button" onClick={handleSync} disabled={syncing}>
              {syncing ? "登録中…" : "同期を実行"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? "出力中…" : "対象データをCSV出力"}
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      <h2 className="mb-2 text-[15px] font-semibold text-text">同期履歴</h2>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyMessage="同期履歴がありません"
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
          />
        </>
      )}
    </div>
  );
}

export default function MealCountSyncPage() {
  return (
    <InternalOnly>
      <MealCountSyncContent />
    </InternalOnly>
  );
}
