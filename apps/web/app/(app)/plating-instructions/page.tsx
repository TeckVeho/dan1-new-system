"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import { getPlatingInstructions } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { PlatingInstruction } from "@/lib/types";

export default function PlatingInstructionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlatingInstruction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlatingInstructions({ page, pageSize });
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

  const columns: DataTableColumn<PlatingInstruction>[] = [
    { key: "serviceDate", header: "喫食日" },
    { key: "customerName", header: "施設" },
    { key: "menuTemplateTitle", header: "定型文", render: (row) => row.menuTemplateTitle ?? "—" },
    {
      key: "body",
      header: "内容",
      render: (row) => <span className="line-clamp-1 text-muted">{row.body.slice(0, 60)}</span>,
    },
    { key: "createdAt", header: "作成日時", render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="盛付指示書"
        description="定型文から本文をスナップショットして作成します。アーカイブ後も過去の内容は変わりません"
        actions={
          user.type === "internal" ? (
            <Link
              href="/plating-instructions/new"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-white hover:bg-primary-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              盛付指示書を作成
            </Link>
          ) : undefined
        }
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={loading}
        emptyMessage="盛付指示書がありません"
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
    </div>
  );
}
