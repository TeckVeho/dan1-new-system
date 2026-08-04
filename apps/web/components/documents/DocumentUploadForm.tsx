"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, createDocument, createDocumentVersion, uploadFile } from "@/lib/api";

type Props = {
  onCreated: () => void;
  onCancel: () => void;
};

const DOCUMENT_TYPES = [
  { value: "menu", label: "献立表" },
  { value: "nutrition", label: "栄養月報" },
  { value: "other", label: "その他" },
];

export function DocumentUploadForm({ onCreated, onCancel }: Props) {
  const [documentType, setDocumentType] = useState("menu");
  const [title, setTitle] = useState("");
  const [serviceMonth, setServiceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [customerId, setCustomerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !file) {
      setError("タイトルとファイルを入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const doc = await createDocument({
        documentType,
        title,
        serviceMonth,
        customerId: customerId || undefined,
      });
      const uploaded = await uploadFile(file);
      await createDocumentVersion(doc.id, uploaded.id);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-white p-4">
      <h3 className="text-[14px] font-semibold text-text">献立資料を登録</h3>

      {error ? (
        <Alert variant="danger" title="エラー">
          {error}
        </Alert>
      ) : null}

      <label className="block text-[13px]">
        <span className="mb-1 block font-medium">資料種別</span>
        <select
          className="w-full rounded-md border border-border px-2 py-1.5"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          {DOCUMENT_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-medium">タイトル</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-medium">対象年月（YYYY-MM）</span>
        <Input
          value={serviceMonth}
          onChange={(e) => setServiceMonth(e.target.value)}
          pattern="\d{4}-\d{2}"
          required
        />
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-medium">施設ID（任意・共通資料は空欄）</span>
        <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="例: 1" />
      </label>

      <label className="block text-[13px]">
        <span className="mb-1 block font-medium">ファイル</span>
        <input
          type="file"
          accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-[13px]"
          required
        />
        {file ? (
          <p className="mt-1 text-[12px] text-muted">
            <Upload className="mr-1 inline h-3 w-3" />
            {file.name}（{(file.size / 1024).toFixed(1)} KB）
          </p>
        ) : null}
      </label>

      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          登録する
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
