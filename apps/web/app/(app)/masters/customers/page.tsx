"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import { getCustomers } from "@/lib/api";
import { startImpersonation } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { Customer } from "@/lib/types";
import { MasterBackLink } from "@/components/masters/MasterBackLink";

function CustomersContent() {
  const router = useRouter();
  const { refresh, can } = useAuth();
  const canImpersonate = can("admin.impersonate");
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCustomers({ page, pageSize, search: search || undefined });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleImpersonate(row: Customer) {
    setImpersonatingId(row.id);
    setError(null);
    const result = await startImpersonation(row.id);
    if (!result.ok) {
      setError(result.message);
      setImpersonatingId(null);
      return;
    }
    await refresh();
    router.push("/dashboard");
  }

  const columns: DataTableColumn<Customer>[] = [
    { key: "customerCode", header: "施設コード" },
    { key: "name", header: "施設名" },
    {
      key: "contractStartDate",
      header: "契約開始",
      render: (row) => formatDate(row.contractStartDate),
    },
    {
      key: "contractEndDate",
      header: "契約終了",
      render: (row) => formatDate(row.contractEndDate),
    },
    {
      key: "isInternalTest",
      header: "区分",
      render: (row) => (row.isInternalTest ? <Badge variant="warning">テスト用</Badge> : <Badge variant="muted">通常</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/masters/customers/${row.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[12px] text-muted hover:bg-bg hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </Link>
          {canImpersonate ? (
            <Button
              size="md"
              variant="secondary"
              onClick={() => handleImpersonate(row)}
              loading={impersonatingId === row.id}
              className="h-7"
            >
              <Eye className="h-3.5 w-3.5" />
              施設ビュー
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <MasterBackLink />
      <PageHeader
        title="施設マスタ"
        description="施設の一覧・成り代わり表示の開始（FR-105, FR-106）"
        actions={
          <Link
            href="/masters/customers/new"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-medium text-white hover:bg-primary/90"
          >
            新規登録
          </Link>
        }
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="施設名・施設コードで検索"
          className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
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

export default function CustomersPage() {
  return (
    <InternalOnly>
      <CustomersContent />
    </InternalOnly>
  );
}
