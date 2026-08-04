"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { getAuditLogs } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";

function AuditLogsContent() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogs({ from: from || undefined, to: to || undefined, page, pageSize });
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

  const columns: DataTableColumn<AuditLog>[] = [
    { key: "createdAt", header: "日時", render: (row) => formatDateTime(row.createdAt) },
    {
      key: "actorType",
      header: "操作者区分",
      render: (row) => (row.actorType === "internal" ? <Badge variant="primary">社内</Badge> : <Badge variant="muted">施設</Badge>),
    },
    { key: "actorName", header: "操作者" },
    {
      key: "impersonatedCustomerName",
      header: "成り代わり先",
      render: (row) => row.impersonatedCustomerName ?? "—",
    },
    { key: "action", header: "操作" },
    { key: "entityType", header: "対象" },
    { key: "summary", header: "内容" },
  ];

  return (
    <div>
      <PageHeader title="監査ログ" description="すべての操作・成り代わりを記録します（FR-001, FR-804）" />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="期間（開始）"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          label="期間（終了）"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} loading={loading} />
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
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <InternalOnly>
      <AuditLogsContent />
    </InternalOnly>
  );
}
