"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlatingInstructionPreview } from "@/components/documents/PlatingInstructionPreview";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiError, createPlatingInstruction, getMenuTemplates } from "@/lib/api";
import type { MenuTemplate } from "@/lib/types";

export default function NewPlatingInstructionPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [serviceDate, setServiceDate] = useState("");
  const [menuTemplateId, setMenuTemplateId] = useState("");
  const [body, setBody] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
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
    if (saveAsTemplate && !templateTitle.trim()) {
      setError("定型文として登録する場合はタイトルを入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPlatingInstruction({
        serviceDate,
        menuTemplateId: menuTemplateId || undefined,
        body: body.trim(),
        saveAsTemplate,
        templateTitle: templateTitle.trim() || undefined,
      });
      router.push("/plating-instructions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const selectedTitle = templates.find((t) => t.id === menuTemplateId)?.title;

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
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-white p-4">
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

            <div className="rounded-md border border-border bg-bg p-3 text-[13px]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                />
                この本文を定型文として登録する
              </label>
              {saveAsTemplate ? (
                <label className="mt-2 block">
                  <span className="mb-1 block text-muted">定型文タイトル</span>
                  <Input
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="例: 汁無し・主菜中央盛付"
                  />
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={saving}>
                作成する
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-3.5 w-3.5" />
                印刷プレビュー
              </Button>
              <Link
                href="/plating-instructions"
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-[13px] font-medium text-text hover:bg-bg"
              >
                キャンセル
              </Link>
            </div>
          </form>

          <div>
            <h3 className="mb-2 text-[14px] font-semibold">プレビュー</h3>
            <PlatingInstructionPreview serviceDate={serviceDate} body={body} title={selectedTitle} />
          </div>
        </div>
      )}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="印刷プレビュー">
        <PlatingInstructionPreview serviceDate={serviceDate} body={body} title={selectedTitle} />
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            印刷する
          </Button>
        </div>
      </Modal>
    </div>
  );
}
