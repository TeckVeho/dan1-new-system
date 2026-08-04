"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, createPlatingInstruction, getMenuTemplates } from "@/lib/api";
import type { MenuTemplate } from "@/lib/types";

export default function NewPlatingInstructionPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [serviceDate, setServiceDate] = useState("");
  const [menuTemplateId, setMenuTemplateId] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMenuTemplates({ pageSize: 200 });
      setTemplates(res.items.filter((t) => t.status === "active"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "定型文の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleTemplateChange(id: string) {
    setMenuTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) setBody(template.body);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceDate || !body.trim()) {
      setError("喫食日と本文を入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPlatingInstruction({
        serviceDate,
        menuTemplateId: menuTemplateId || undefined,
        body: body.trim(),
      });
      router.push("/plating-instructions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="盛付指示書を作成"
        description="定型文を選択して本文をスナップショット保存します。アーカイブ後も過去の内容は変わりません"
        actions={
          <Link
            href="/plating-instructions"
            className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-[13px] font-medium text-text hover:bg-bg"
          >
            一覧へ戻る
          </Link>
        }
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-lg border border-border bg-white p-4">
          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">喫食日</span>
            <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
          </label>

          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">定型文（任意）</span>
            <select
              className="w-full rounded-md border border-border px-2 py-1.5"
              value={menuTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              <option value="">選択しない（手入力）</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">本文（スナップショット）</span>
            <textarea
              className="min-h-48 w-full rounded-md border border-border px-3 py-2 text-[13px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </label>

          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              作成する
            </Button>
            <Link
              href="/plating-instructions"
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-[13px] font-medium text-text hover:bg-bg"
            >
              キャンセル
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
