"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge, FilterChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDocuments, getMenuTemplates } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { DocumentItem, MenuTemplate } from "@/lib/types";

type Tab = "documents" | "templates";

function DocumentsTable() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDocuments({ page, pageSize });
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

  const columns: DataTableColumn<DocumentItem>[] = [
    { key: "documentType", header: "資料種別" },
    { key: "customerName", header: "対象施設", render: (row) => row.customerName ?? "共通" },
    { key: "serviceMonth", header: "対象年月" },
    { key: "latestVersion", header: "最新版", render: (row) => `v${row.latestVersion}` },
    { key: "generatedAt", header: "生成日時", render: (row) => formatDateTime(row.generatedAt) },
    {
      key: "publishStatus",
      header: "公開状態",
      render: (row) =>
        row.publishStatus === "published" ? <Badge variant="success">公開</Badge> : <Badge variant="muted">非公開</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: () => (
        <button type="button" className="rounded-md p-1.5 text-muted transition-colors hover:bg-bg hover:text-primary">
          <Download className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {user.type === "internal" ? (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary">
            <Upload className="h-3.5 w-3.5" />
            資料を登録
          </Button>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={loading}
        emptyMessage="公開された資料がありません"
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
  );
}

function TemplatesTable() {
  const [rows, setRows] = useState<MenuTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMenuTemplates({ page, pageSize });
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

  const columns: DataTableColumn<MenuTemplate>[] = [
    { key: "title", header: "短縮名" },
    {
      key: "body",
      header: "本文プレビュー",
      render: (row) => <span className="line-clamp-1 text-muted">{row.body.slice(0, 60)}</span>,
    },
    {
      key: "tags",
      header: "タグ",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.map((t) => (
            <Badge key={t} variant="muted">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: "usageCount", header: "使用回数", className: "text-right tabular-nums" },
    { key: "lastUsedAt", header: "最終使用日", render: (row) => (row.lastUsedAt ? formatDateTime(row.lastUsedAt) : "—") },
    {
      key: "status",
      header: "状態",
      render: (row) => (row.status === "active" ? <Badge variant="success">有効</Badge> : <Badge variant="muted">アーカイブ済</Badge>),
    },
  ];

  return (
    <>
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
        emptyMessage="定型文がありません"
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
  );
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("documents");

  return (
    <div>
      <PageHeader title="献立資料" description="献立表・栄養月報などの資料一覧と、盛付指示書用の定型文を管理します" />

      {user.type === "internal" ? (
        <div className="mb-4 flex gap-1.5">
          <FilterChip active={tab === "documents"} onClick={() => setTab("documents")} label="資料一覧" />
          <FilterChip active={tab === "templates"} onClick={() => setTab("templates")} label="献立定型文" />
        </div>
      ) : null}

      {tab === "documents" ? <DocumentsTable /> : <TemplatesTable />}
    </div>
  );
}
