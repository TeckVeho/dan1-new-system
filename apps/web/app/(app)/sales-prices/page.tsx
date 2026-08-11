"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateSalesPrice, previewSalesPrice } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function SalesPricesContent() {
  const router = useRouter();
  const [invoiceMonth, setInvoiceMonth] = useState(currentMonth());
  const [previewRows, setPreviewRows] = useState<(string | number)[][]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await previewSalesPrice({ invoiceMonth });
      setPreviewRows(result.preview);
      setRowCount(result.rowCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "プレビューに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const result = await generateSalesPrice({ invoiceMonth, format: "xlsx" });
      setMessage("売価出力ジョブを登録しました");
      router.push(`/admin/jobs/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "出力に失敗しました");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="売価計算"
        description="対象月の確定注文から売価データを計算・出力します（仮フォーマット）"
        actions={
          <Link href="/reports">
            <Button variant="secondary" type="button">帳票出力</Button>
          </Link>
        }
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" title="完了" className="mb-4">{message}</Alert> : null}

      <form onSubmit={handlePreview} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-white p-4">
        <div>
          <label className="mb-1 block text-[12px] text-muted">対象月</label>
          <Input type="month" value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} required />
        </div>
        <Button type="submit" loading={loading}>プレビュー</Button>
        <Button type="button" variant="secondary" loading={generating} onClick={handleGenerate}>
          Excel出力
        </Button>
      </form>

      {rowCount > 0 ? (
        <section className="rounded-lg border border-border bg-white p-4">
          <p className="mb-3 text-[13px] text-muted">全 {formatNumber(rowCount)} 行（先頭20行を表示）</p>
          <div className="overflow-auto">
            <table className="min-w-full text-[12px]">
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-b border-border">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-1 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function SalesPricesPage() {
  return (
    <InternalOnly>
      <SalesPricesContent />
    </InternalOnly>
  );
}
