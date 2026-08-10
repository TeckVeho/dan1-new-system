"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Archive, Merge } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { MasterBackLink } from "@/components/masters/MasterBackLink";
import {
  ApiError,
  bulkArchiveMenuTemplates,
  getMenuTemplateDuplicates,
  getMenuTemplates,
  mergeMenuTemplates,
  updateMasterSortOrder,
} from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { MenuTemplate, MenuTemplateDuplicateGroup } from "@/lib/types";

export function MenuTemplatesManager() {
  const [rows, setRows] = useState<MenuTemplate[]>([]);
  const [duplicates, setDuplicates] = useState<MenuTemplateDuplicateGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [templates, dupes] = await Promise.all([
        getMenuTemplates({ page, pageSize, search: search || undefined }),
        getMenuTemplateDuplicates(),
      ]);
      setRows(templates.items);
      setTotal(templates.total);
      setDuplicates(dupes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setRows(next);
    await updateMasterSortOrder(
      "setout-directions",
      next.map((row, sortOrder) => ({ id: row.id, sortOrder: sortOrder + 1 })),
    );
    setMessage("並び順を保存しました");
  }

  async function handleBulkArchiveUnused() {
    if (!confirm("使用回数0かつ90日以上未使用の定型文をアーカイブします。よろしいですか？")) return;
    setBusy(true);
    setError(null);
    try {
      const result = await bulkArchiveMenuTemplates({ unusedSinceDays: 90 });
      setMessage(`${result.archived}件をアーカイブしました`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "アーカイブに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleMergeGroup(group: MenuTemplateDuplicateGroup) {
    const keep = group.templates.reduce((best, current) => (current.usageCount >= best.usageCount ? current : best));
    const mergeIds = group.templates.filter((t) => t.id !== keep.id).map((t) => t.id);
    if (!confirm(`「${keep.title}」を残して ${mergeIds.length} 件を統合します。よろしいですか？`)) return;
    setBusy(true);
    setError(null);
    try {
      await mergeMenuTemplates({ keepId: keep.id, mergeIds });
      setMessage("重複定型文を統合しました");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "統合に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const columns: DataTableColumn<MenuTemplate>[] = [
    {
      key: "sort",
      header: "順序",
      className: "w-20",
      render: (row) => {
        const index = rows.findIndex((item) => item.id === row.id);
        return (
          <div className="flex gap-1">
            <button type="button" className="rounded p-1 hover:bg-bg" onClick={() => moveRow(index, -1)} aria-label="上へ">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="rounded p-1 hover:bg-bg" onClick={() => moveRow(index, 1)} aria-label="下へ">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
    { key: "title", header: "短縮名" },
    {
      key: "body",
      header: "本文プレビュー",
      render: (row) => <span className="line-clamp-2 text-muted">{row.body}</span>,
    },
    { key: "usageCount", header: "使用回数", className: "text-right tabular-nums" },
    {
      key: "lastUsedAt",
      header: "最終使用日",
      render: (row) => (row.lastUsedAt ? formatDateTime(row.lastUsedAt) : "—"),
    },
    {
      key: "status",
      header: "状態",
      render: (row) =>
        row.status === "active" ? <Badge variant="success">有効</Badge> : <Badge variant="muted">アーカイブ済</Badge>,
    },
  ];

  return (
    <InternalOnly>
      <MasterBackLink />
      <PageHeader
        title="献立定型文"
        description="盛付指示書の定型文を管理します。並び順・重複整理・一括アーカイブに対応しています"
        actions={
          <Button variant="secondary" onClick={handleBulkArchiveUnused} loading={busy}>
            <Archive className="h-3.5 w-3.5" />
            未使用を一括アーカイブ
          </Button>
        }
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      ) : null}

      {duplicates.length > 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-[14px] font-semibold text-amber-900">重複候補 ({duplicates.length} グループ)</h3>
          <div className="space-y-3">
            {duplicates.map((group) => (
              <div key={group.normalizedBody} className="rounded-md border border-amber-100 bg-white p-3 text-[13px]">
                <p className="mb-2 line-clamp-2 text-muted">{group.normalizedBody}</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {group.templates.map((template) => (
                    <Badge key={template.id} variant="muted">
                      {template.title}（{template.usageCount}回）
                    </Badge>
                  ))}
                </div>
                <Button type="button" variant="secondary" onClick={() => handleMergeGroup(group)} loading={busy}>
                  <Merge className="h-3.5 w-3.5" />
                  使用回数が多い方を残して統合
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <Input
          placeholder="定型文を検索"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />
      </div>

      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} loading={loading} emptyMessage="定型文がありません" />
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
    </InternalOnly>
  );
}
