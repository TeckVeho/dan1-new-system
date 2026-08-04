"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ApiError,
  createDocumentVersion,
  downloadFile,
  getDocumentById,
  getDocumentVersions,
  uploadFile,
} from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { DocumentVersion } from "@/lib/types";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [document, setDocument] = useState<Awaited<ReturnType<typeof getDocumentById>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [doc, versions] = await Promise.all([getDocumentById(params.id), getDocumentVersions(params.id)]);
      setDocument({ ...doc, versions });
    } catch (e) {
      setDocument(null);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(file: File) {
    if (!document) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await uploadFile(file);
      await createDocumentVersion(document.id, uploaded.id);
      setMessage("新版を登録しました");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  const versionColumns: DataTableColumn<DocumentVersion>[] = [
    { key: "versionNo", header: "版", render: (row) => `v${row.versionNo}` },
    { key: "generatedAt", header: "生成日時", render: (row) => formatDateTime(row.generatedAt) },
    {
      key: "status",
      header: "状態",
      render: (row) =>
        row.supersededAt ? <Badge variant="muted">旧版</Badge> : <Badge variant="success">最新</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Button type="button" variant="ghost" onClick={() => downloadFile(row.fileId)}>
          <Download className="h-3.5 w-3.5" />
          ダウンロード
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
        読み込み中…
      </div>
    );
  }

  if (!document) {
    return (
      <Alert variant="danger" title="エラー">
        {error ?? "資料が見つかりません"}
      </Alert>
    );
  }

  return (
    <div>
      <PageHeader
        title={document.title}
        description={`${document.documentType} / ${document.serviceMonth} / ${document.customerName ?? "共通"}`}
        actions={
          document.latestFileId ? (
            <Button variant="secondary" onClick={() => downloadFile(document.latestFileId!)}>
              <Download className="h-3.5 w-3.5" />
              最新版をダウンロード
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <Link href="/documents" className="text-[13px] text-primary hover:underline">
          ← 資料一覧に戻る
        </Link>
      </div>

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

      <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 text-[13px] sm:grid-cols-2">
        <div>
          <span className="text-muted">最新版</span>
          <p className="font-medium">v{document.latestVersion || "—"}</p>
        </div>
        <div>
          <span className="text-muted">公開状態</span>
          <p>
            {document.publishStatus === "published" ? (
              <Badge variant="success">公開</Badge>
            ) : (
              <Badge variant="muted">非公開</Badge>
            )}
          </p>
        </div>
        <div>
          <span className="text-muted">最終生成</span>
          <p>{document.generatedAt ? formatDateTime(document.generatedAt) : "—"}</p>
        </div>
      </div>

      {user.type === "internal" ? (
        <div className="mb-6 rounded-lg border border-border bg-white p-4">
          <h3 className="mb-2 text-[14px] font-semibold">新版をアップロード</h3>
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
            className="text-[13px]"
          />
          {uploading ? <p className="mt-2 text-[12px] text-muted">アップロード中…</p> : null}
        </div>
      ) : null}

      <h3 className="mb-2 text-[14px] font-semibold">版履歴</h3>
      <DataTable
        columns={versionColumns}
        rows={document.versions}
        getRowKey={(row) => row.id}
        emptyMessage="版履歴がありません"
      />
    </div>
  );
}
