"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { getRiceOrderLogs } from "@/lib/api";
import { formatDateTime, toWeekStart } from "@/lib/utils";
import type { RiceOrderLogItem } from "@/lib/types";

function RiceLogsContent() {
  const [rows, setRows] = useState<RiceOrderLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [dateFrom, setDateFrom] = useState(() => toWeekStart(new Date()));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRiceOrderLogs({ dateFrom, dateTo, page, perPage: pageSize });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: DataTableColumn<RiceOrderLogItem>[] = [
    { key: "createdAt", header: "日時", render: (row) => formatDateTime(row.createdAt) },
    { key: "customerCode", header: "施設番号" },
    { key: "customerName", header: "施設名" },
    { key: "summary", header: "内容" },
    { key: "actorName", header: "操作者" },
  ];

  return (
    <div>
      <PageHeader title="合数ログ" description="合数の変更履歴を確認します" />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">読み込み中…</div>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} emptyMessage="合数ログがありません" />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}
    </div>
  );
}

export default function RiceLogsPage() {
  return (
    <InternalOnly>
      <RiceLogsContent />
    </InternalOnly>
  );
}
