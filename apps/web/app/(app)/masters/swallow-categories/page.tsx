"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { Badge } from "@/components/ui/badge";
import { createMaster, deleteMaster, getSwallowCategories, updateMaster } from "@/lib/api";
import type { SwallowCategory } from "@/lib/types";

type FormState = { code: string; name: string; sortOrder: number; isActive: boolean };

const EMPTY_FORM: FormState = { code: "", name: "", sortOrder: 0, isActive: true };

function SwallowCategoriesContent() {
  const [rows, setRows] = useState<SwallowCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSwallowCategories({ pageSize: 200 });
      setRows(res.items.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row: SwallowCategory) {
    setEditingId(row.id);
    setForm({ code: row.code, name: row.name, sortOrder: row.sortOrder, isActive: row.isActive });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingId) {
        await updateMaster("swallow-categories", editingId, form);
        setMessage("嚥下食区分を更新しました");
      } else {
        await createMaster("swallow-categories", form);
        setMessage("嚥下食区分を追加しました。注文入力画面の行が自動的に増えます。");
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: SwallowCategory) {
    if (!window.confirm(`「${row.name}」を削除しますか？`)) return;
    setError(null);
    try {
      await deleteMaster("swallow-categories", row.id);
      setMessage("削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  const columns: DataTableColumn<SwallowCategory>[] = [
    { key: "sortOrder", header: "表示順", className: "w-16 tabular-nums" },
    { key: "code", header: "コード" },
    { key: "name", header: "名称" },
    {
      key: "isActive",
      header: "状態",
      render: (row) => (row.isActive ? <Badge variant="success">有効</Badge> : <Badge variant="muted">無効</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => startEdit(row)}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-bg hover:text-primary"
            aria-label="編集"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger/5 hover:text-danger"
            aria-label="削除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="嚥下食区分"
        description="表示順は週間注文入力・注文履歴の行の並び順に反映されます（REQ-07, REQ-09）"
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

      <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-text">
          {editingId ? "嚥下食区分を編集" : "嚥下食区分を追加"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-4">
          <Input
            label="コード"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="名称"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <Input
            label="表示順"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
          />
          <div className="flex items-end gap-2 sm:col-span-4">
            <label className="flex items-center gap-2 text-[13px] text-text">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary"
              />
              有効
            </label>
            <div className="ml-auto flex gap-2">
              {editingId ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  キャンセル
                </Button>
              ) : null}
              <Button type="submit" loading={saving}>
                <Plus className="h-3.5 w-3.5" />
                {editingId ? "更新する" : "追加する"}
              </Button>
            </div>
          </div>
        </form>
      </section>

      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} loading={loading} />
    </div>
  );
}

export default function SwallowCategoriesPage() {
  return (
    <InternalOnly>
      <SwallowCategoriesContent />
    </InternalOnly>
  );
}
