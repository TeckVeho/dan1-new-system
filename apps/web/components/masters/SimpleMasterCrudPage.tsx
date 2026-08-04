"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MasterBackLink } from "@/components/masters/MasterBackLink";
import { MasterListShell } from "@/components/masters/MasterListShell";
import type { DataTableColumn } from "@/components/layout/DataTable";
import { createMaster, deleteMaster, getMasterList, updateMaster, type MasterResource } from "@/lib/api";

export type MasterFieldType = "text" | "number" | "checkbox" | "date" | "datetime-local" | "textarea";

export type MasterFieldConfig = {
  key: string;
  label: string;
  type?: MasterFieldType;
  required?: boolean;
  list?: boolean;
  colSpan?: number;
  placeholder?: string;
};

export type SimpleMasterConfig = {
  resource: MasterResource;
  title: string;
  description: string;
  fields: MasterFieldConfig[];
  listColumns?: string[];
  extraQuery?: Record<string, string>;
};

function defaultForm(fields: MasterFieldConfig[]): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "checkbox") form[field.key] = true;
    else if (field.type === "number") form[field.key] = 0;
    else form[field.key] = "";
  }
  return form;
}

function SimpleMasterCrudContent({ config }: { config: SimpleMasterConfig }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(() => defaultForm(config.fields));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMasterList<Record<string, unknown>>(config.resource, {
        page,
        pageSize,
        search: search || undefined,
        ...(config.extraQuery?.customerId ? { customerId: config.extraQuery.customerId } : {}),
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [config.resource, config.extraQuery, page, pageSize, search]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row: Record<string, unknown>) {
    setEditingId(String(row.id));
    const next: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = row[field.key];
      if (field.key === "ruleConfig" && raw && typeof raw === "object") {
        next[field.key] = JSON.stringify(raw, null, 2);
      } else {
        next[field.key] = raw ?? (field.type === "checkbox" ? false : field.type === "number" ? 0 : "");
      }
    }
    setForm(next);
  }

  function resetForm() {
    setEditingId(null);
    setForm(defaultForm(config.fields));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { ...form, ...(config.extraQuery ?? {}) };
      if (typeof payload.ruleConfig === "string" && payload.ruleConfig) {
        payload.ruleConfig = JSON.parse(payload.ruleConfig as string);
      }
      if (editingId) {
        await updateMaster(config.resource, editingId, payload);
        setMessage("更新しました");
      } else {
        await createMaster(config.resource, payload);
        setMessage("追加しました");
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    if (!window.confirm("削除しますか？")) return;
    setError(null);
    try {
      await deleteMaster(config.resource, String(row.id));
      setMessage("削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  const listKeys = config.listColumns ?? config.fields.filter((f) => f.list !== false).map((f) => f.key);

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    ...listKeys.map((key) => {
      const field = config.fields.find((f) => f.key === key);
      return {
        key,
        header: field?.label ?? key,
        render: (row: Record<string, unknown>) => {
          const value = row[key];
          if (field?.type === "checkbox") {
            return value ? <Badge variant="success">はい</Badge> : <Badge variant="muted">いいえ</Badge>;
          }
          if (key === "isActive") {
            return value ? <Badge variant="success">有効</Badge> : <Badge variant="muted">無効</Badge>;
          }
          if (key === "isEnabled") {
            return value ? <Badge variant="success">有効</Badge> : <Badge variant="muted">無効</Badge>;
          }
          if (key === "isHoliday") {
            return value ? <Badge variant="warning">休業</Badge> : <Badge variant="muted">営業</Badge>;
          }
          return String(value ?? "—");
        },
      };
    }),
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => startEdit(row)} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-primary" aria-label="編集">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => handleDelete(row)} className="rounded-md p-1.5 text-muted hover:bg-danger/5 hover:text-danger" aria-label="削除">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <MasterBackLink />
      <PageHeader title={config.title} description={config.description} />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-text">{editingId ? "編集" : "追加"}</h2>
        <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-4">
          {config.fields.map((field) => {
            const span = field.colSpan ? `sm:col-span-${field.colSpan}` : "";
            if (field.type === "checkbox") {
              return (
                <label key={field.key} className={`flex items-center gap-2 text-[13px] ${span}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  {field.label}
                </label>
              );
            }
            if (field.type === "textarea") {
              return (
                <div key={field.key} className={`sm:col-span-4 ${span}`}>
                  <label className="mb-1 block text-[12px] font-medium text-muted">{field.label}</label>
                  <textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    required={field.required}
                    rows={4}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
              );
            }
            return (
              <div key={field.key} className={span}>
                <Input
                  label={field.label}
                  type={field.type ?? "text"}
                  value={String(form[field.key] ?? "")}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                  required={field.required}
                  placeholder={field.placeholder}
                />
              </div>
            );
          })}
          <div className="flex items-end gap-2 sm:col-span-4">
            {editingId ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                キャンセル
              </Button>
            ) : null}
            <Button type="submit" loading={saving} className="ml-auto">
              <Plus className="h-3.5 w-3.5" />
              {editingId ? "更新する" : "追加する"}
            </Button>
          </div>
        </form>
      </section>

      <MasterListShell
        search={search}
        onSearchChange={setSearch}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        columns={columns}
        rows={rows}
        getRowKey={(row) => String(row.id)}
        loading={loading}
      />
    </div>
  );
}

export function SimpleMasterCrudPage({ config }: { config: SimpleMasterConfig }) {
  return (
    <InternalOnly>
      <SimpleMasterCrudContent config={config} />
    </InternalOnly>
  );
}
