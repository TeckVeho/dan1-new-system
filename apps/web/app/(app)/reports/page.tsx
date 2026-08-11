"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateReport, getReportCatalog } from "@/lib/api";
import type { ReportCatalogItem, ReportParamField } from "@/lib/types";
import { toWeekStart } from "@/lib/utils";

const CATEGORY_LABELS: Record<ReportCatalogItem["category"], string> = {
  procurement: "発注",
  production: "製造",
  delivery: "配送",
  order: "受注",
  billing: "請求",
};

function defaultForm(fields: ReportParamField[]): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "boolean") form[field.key] = false;
    else if (field.type === "select") form[field.key] = field.options?.[0]?.value ?? "";
    else form[field.key] = "";
  }
  return form;
}

function ReportsContent() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getReportCatalog();
      setCatalog(items);
      if (!selectedKey && items.length > 0) {
        setSelectedKey(items[0]!.key);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => catalog.find((item) => item.key === selectedKey) ?? null,
    [catalog, selectedKey],
  );

  useEffect(() => {
    if (!selected) return;
    const next = defaultForm(selected.paramFields);
    if (selected.paramFields.some((f) => f.key === "serviceDateFrom")) {
      next.serviceDateFrom = toWeekStart(new Date());
    }
    if (selected.paramFields.some((f) => f.key === "serviceDateTo")) {
      const weekStart = new Date(String(next.serviceDateFrom || toWeekStart(new Date())));
      weekStart.setUTCDate(weekStart.getUTCDate() + 6);
      next.serviceDateTo = weekStart.toISOString().slice(0, 10);
    }
    if (selected.paramFields.some((f) => f.key === "format") && !next.format) {
      next.format = selected.formats[0] ?? "xlsx";
    }
    setForm(next);
  }, [selected]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const payload = { ...form };
      for (const field of selected.paramFields) {
        if (field.type === "boolean") continue;
        if (!payload[field.key] && !field.required) {
          delete payload[field.key];
        }
      }
      const result = await generateReport(selected.key, payload);
      setMessage("帳票生成ジョブを登録しました。処理状況からダウンロードできます。");
      router.push(`/admin/jobs/${result.jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "帳票の生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ReportCatalogItem[]>();
    for (const item of catalog) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [catalog]);

  return (
    <div>
      <PageHeader
        title="帳票出力"
        description="条件を指定して帳票を生成します。大量データは裏側で処理され、完了後にダウンロードできます"
        actions={
          <Link href="/admin/jobs">
            <Button variant="secondary" type="button">処理状況</Button>
          </Link>
        }
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" title="完了" className="mb-4">{message}</Alert> : null}

      {loading ? (
        <div className="text-[13px] text-muted">読み込み中…</div>
      ) : catalog.length === 0 ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          利用可能な帳票がありません
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-border bg-white p-3">
            <h2 className="mb-2 text-[13px] font-semibold text-text">帳票一覧</h2>
            <div className="space-y-4">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                    {CATEGORY_LABELS[category as ReportCatalogItem["category"]]}
                  </p>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          className={`w-full rounded-md px-2 py-2 text-left text-[13px] ${
                            selectedKey === item.key
                              ? "bg-primary/10 text-primary"
                              : "text-text hover:bg-bg"
                          }`}
                          onClick={() => setSelectedKey(item.key)}
                        >
                          <span className="font-medium">{item.name}</span>
                          {item.specStatus === "provisional" ? (
                            <Badge variant="warning" className="ml-2">仮</Badge>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-border bg-white p-4">
            {selected ? (
              <>
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-text">{selected.name}</h2>
                    <Badge variant="muted">{CATEGORY_LABELS[selected.category]}</Badge>
                    {selected.specStatus === "provisional" ? (
                      <Badge variant="warning">仮フォーマット</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] text-muted">{selected.description}</p>
                  {selected.specStatus === "provisional" ? (
                    <p className="mt-2 text-[12px] text-warning">
                      列構成は現行フォーマット確認前の仮仕様です。実ファイル提供後に差し替えます。
                    </p>
                  ) : null}
                </div>

                <form onSubmit={handleGenerate} className="grid gap-3 sm:grid-cols-2">
                  {selected.paramFields.map((field) => (
                    <div key={field.key} className={field.type === "boolean" ? "sm:col-span-2" : undefined}>
                      <label className="mb-1 block text-[12px] text-muted">
                        {field.label}
                        {field.required ? " *" : ""}
                      </label>
                      {field.type === "select" ? (
                        <select
                          className="h-9 w-full rounded-md border border-border bg-white px-3 text-[13px]"
                          value={String(form[field.key] ?? "")}
                          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          required={field.required}
                        >
                          {(field.options ?? []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <label className="flex items-center gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            checked={Boolean(form[field.key])}
                            onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                          />
                          有効
                        </label>
                      ) : (
                        <Input
                          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                          value={String(form[field.key] ?? "")}
                          placeholder={field.placeholder}
                          required={field.required}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              [field.key]:
                                field.type === "number"
                                  ? e.target.value === ""
                                    ? ""
                                    : Number(e.target.value)
                                  : e.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Button type="submit" loading={generating}>
                      帳票を生成
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <p className="text-[13px] text-muted">左の一覧から帳票を選択してください</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <InternalOnly>
      <ReportsContent />
    </InternalOnly>
  );
}
