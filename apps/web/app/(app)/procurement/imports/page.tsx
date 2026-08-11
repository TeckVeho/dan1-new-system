"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { getProcurementImports, postProcurementImport, uploadFile } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ImportRecord } from "@/lib/types";

const STATUS_LABEL: Record<ImportRecord["status"], { label: string; variant: "muted" | "primary" | "success" | "danger" }> = {
  queued: { label: "待機中", variant: "muted" },
  running: { label: "実行中", variant: "primary" },
  completed: { label: "完了", variant: "success" },
  failed: { label: "失敗", variant: "danger" },
};

function ImportForm({ onQueued }: { onQueued: () => void }) {
  const [supplierId, setSupplierId] = useState("");
  const [fileType, setFileType] = useState("cooking_sheet");
  const [targetDateFrom, setTargetDateFrom] = useState("");
  const [targetDateTo, setTargetDateTo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setError("取込ファイルを選択してください");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await uploadFile(selectedFile);
      const res = await postProcurementImport({
        fileType,
        supplierId,
        fileId: uploaded.id,
        targetDateFrom: targetDateFrom || undefined,
        targetDateTo: targetDateTo || undefined,
      });
      setMessage(`取込を登録しました（ジョブID: ${res.jobId}）`);
      setSelectedFile(null);
      onQueued();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取込の登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
      <h2 className="text-[15px] font-semibold text-text">らくらく献立ファイルの取込</h2>
      <p className="mt-1 text-[12px] text-muted">非同期ジョブとして登録され、進捗はジョブ管理から確認できます</p>

      {error ? (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className="mt-3">
          {message}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Select label="ファイル種別" value={fileType} onChange={(e) => setFileType(e.target.value)}>
          <option value="cooking_sheet">調理表</option>
          <option value="order_file">注文ファイル</option>
          <option value="cooking_file">食数ファイル</option>
        </Select>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-muted">取込ファイル</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="block w-full text-[13px] text-text file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-primary"
            required
          />
        </div>
        <Input label="対象業者ID" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required />
        <Input
          label="対象期間（開始）"
          type="date"
          value={targetDateFrom}
          onChange={(e) => setTargetDateFrom(e.target.value)}
        />
        <Input
          label="対象期間（終了）"
          type="date"
          value={targetDateTo}
          onChange={(e) => setTargetDateTo(e.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" loading={saving} className="w-full">
            <Upload className="h-3.5 w-3.5" />
            取込を開始
          </Button>
        </div>
      </form>
    </section>
  );
}

function ImportsContent() {
  const [rows, setRows] = useState<ImportRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProcurementImports({ page, pageSize });
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

  const columns: DataTableColumn<ImportRecord>[] = [
    { key: "importType", header: "種別" },
    { key: "supplierName", header: "業者" },
    { key: "targetDateFrom", header: "対象期間", render: (row) => `${row.targetDateFrom} 〜 ${row.targetDateTo}` },
    {
      key: "status",
      header: "状態",
      render: (row) => <Badge variant={STATUS_LABEL[row.status].variant}>{STATUS_LABEL[row.status].label}</Badge>,
    },
    { key: "errorCount", header: "エラー件数", className: "text-right tabular-nums" },
    { key: "importedBy", header: "実施者" },
    { key: "importedAt", header: "取込日時", render: (row) => formatDateTime(row.importedAt) },
  ];

  return (
    <div>
      <PageHeader title="データ取込" description="らくらく献立ファイルの非同期取込・履歴管理（FR-701）" />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <ImportForm onQueued={load} />

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

export default function ProcurementImportsPage() {
  return (
    <InternalOnly>
      <ImportsContent />
    </InternalOnly>
  );
}
