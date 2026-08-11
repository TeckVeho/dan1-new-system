"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  correctInvoice,
  deleteDraftInvoice,
  downloadInvoicePdf,
  getInvoice,
  getInvoiceCorrections,
  issueInvoice,
} from "@/lib/api";
import type {
  InvoiceCorrectionHistory,
  InvoiceDetail,
  InvoiceLine,
  InvoiceLineInput,
  InvoiceStatus,
} from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "下書き",
  issued: "発行済",
  corrected: "訂正済",
  cancelled: "取消",
};

const STATUS_VARIANT: Record<InvoiceStatus, "muted" | "primary" | "success" | "warning" | "danger"> = {
  draft: "muted",
  issued: "success",
  corrected: "warning",
  cancelled: "danger",
};

type EditableLine = InvoiceLineInput & { key: string };

function toEditableLines(lines: InvoiceLine[]): EditableLine[] {
  return lines.map((line) => ({
    key: line.id,
    description: line.description,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    lineType: (line.lineType as EditableLine["lineType"]) ?? "meal",
  }));
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { user, can } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [reason, setReason] = useState("");
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [corrections, setCorrections] = useState<InvoiceCorrectionHistory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoice(id);
      setInvoice(data);
      setEditLines(toEditableLines(data.lines));
      if (data.version > 1 || data.status === "corrected") {
        try {
          const history = await getInvoiceCorrections(id);
          setCorrections(history);
        } catch {
          setCorrections(null);
        }
      } else {
        setCorrections(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleIssue() {
    if (!window.confirm("この請求書を発行しますか？")) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await issueInvoice(id);
      setInvoice(updated);
      setMessage("請求書を発行しました");
      window.setTimeout(() => {
        void load();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "発行に失敗しました");
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("下書き請求を削除しますか？")) return;
    setActing(true);
    setError(null);
    try {
      await deleteDraftInvoice(id);
      router.push("/invoices");
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
      setActing(false);
    }
  }

  async function handleCorrect(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("訂正版を発行しますか？元の請求書は訂正済みとして残ります。")) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await correctInvoice(id, {
        lines: editLines.map(({ description, quantity, unitPrice, lineType }) => ({
          description,
          quantity,
          unitPrice,
          lineType,
        })),
        reason: reason || undefined,
      });
      setInvoice(updated);
      setCorrecting(false);
      setMessage("訂正版を発行しました");
      router.replace(`/invoices/${updated.id}`);
      window.setTimeout(() => {
        void load();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "訂正に失敗しました");
    } finally {
      setActing(false);
    }
  }

  function updateLine(index: number, patch: Partial<EditableLine>) {
    setEditLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  const lineColumns: DataTableColumn<InvoiceLine>[] = [
    { key: "lineNo", header: "行", render: (row) => row.lineNo },
    { key: "description", header: "内容", render: (row) => row.description },
    { key: "quantity", header: "数量", render: (row) => formatNumber(row.quantity) },
    {
      key: "unitPrice",
      header: "単価",
      render: (row) => `¥${formatNumber(row.unitPrice)}`,
    },
    {
      key: "amount",
      header: "金額",
      render: (row) => `¥${formatNumber(row.amount)}`,
    },
    { key: "lineType", header: "区分", render: (row) => row.lineType },
  ];

  if (loading) {
    return <div className="text-[13px] text-muted">読み込み中…</div>;
  }

  if (!invoice) {
    return <Alert variant="danger">請求書が見つかりません</Alert>;
  }

  const taxRate =
    invoice.settingsSnapshot && typeof invoice.settingsSnapshot.taxRate === "string"
      ? invoice.settingsSnapshot.taxRate
      : null;

  return (
    <div>
      <PageHeader
        title={`請求 ${invoice.invoiceMonth}`}
        description={
          user.type === "internal" && invoice.customer
            ? `${invoice.customer.customerCode} ${invoice.customer.name}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/invoices">
              <Button variant="secondary" type="button">一覧に戻る</Button>
            </Link>
            {can("invoice.issue") && invoice.status === "draft" ? (
              <Button type="button" loading={acting} onClick={handleIssue}>
                発行
              </Button>
            ) : null}
            {can("invoice.close") && invoice.status === "draft" ? (
              <Button type="button" variant="secondary" loading={acting} onClick={handleDelete}>
                削除
              </Button>
            ) : null}
            {can("invoice.correct") && invoice.status === "issued" && !correcting ? (
              <Button type="button" variant="secondary" onClick={() => setCorrecting(true)}>
                訂正
              </Button>
            ) : null}
            {can("invoice.read") && (invoice.status === "issued" || invoice.status === "corrected") ? (
              invoice.pdfFileId ? (
                <Button type="button" variant="secondary" onClick={() => downloadInvoicePdf(id)}>
                  PDFダウンロード
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => load()}>
                  PDF生成状況を更新
                </Button>
              )
            ) : null}
          </div>
        }
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" title="完了" className="mb-4">{message}</Alert> : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[12px] text-muted">状態</p>
          <p className="mt-1">
            <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
          </p>
        </div>
        <div>
          <p className="text-[12px] text-muted">版</p>
          <p className="mt-1 text-[14px] font-medium">v{invoice.version}</p>
        </div>
        <div>
          <p className="text-[12px] text-muted">合計（税込）</p>
          <p className="mt-1 text-[14px] font-medium">¥{formatNumber(invoice.totalAmount)}</p>
        </div>
        <div>
          <p className="text-[12px] text-muted">発行日時</p>
          <p className="mt-1 text-[14px]">{formatDateTime(invoice.issuedAt)}</p>
        </div>
        {taxRate ? (
          <div>
            <p className="text-[12px] text-muted">適用税率</p>
            <p className="mt-1 text-[14px]">{taxRate}%</p>
          </div>
        ) : null}
        {(invoice.status === "issued" || invoice.status === "corrected") && !invoice.pdfFileId ? (
          <div className="sm:col-span-2">
            <p className="text-[12px] text-muted">PDF</p>
            <p className="mt-1 text-[13px] text-muted">生成中です。しばらくしてから「PDF生成状況を更新」を押してください。</p>
          </div>
        ) : null}
      </div>

      <section className="mb-4 rounded-lg border border-border bg-white p-4">
        <h2 className="mb-3 text-[14px] font-semibold">明細</h2>
        <DataTable
          columns={lineColumns}
          rows={invoice.lines}
          getRowKey={(row) => row.id}
          emptyMessage="明細がありません"
        />
      </section>

      {corrections && corrections.items.length > 1 ? (
        <section className="mb-4 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 text-[14px] font-semibold">訂正履歴</h2>
          <ul className="space-y-3">
            {corrections.items.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                  <span className="text-[13px] font-medium">v{item.version}</span>
                  <span className="text-[13px]">¥{formatNumber(item.totalAmount)}</span>
                  {item.id === invoice.id ? (
                    <Badge variant="primary">現在表示中</Badge>
                  ) : (
                    <Link href={`/invoices/${item.id}`} className="text-[13px] text-primary hover:underline">
                      この版を見る
                    </Link>
                  )}
                </div>
                {item.correctionReason ? (
                  <p className="mt-2 text-[13px] text-muted">理由: {item.correctionReason}</p>
                ) : null}
                <p className="mt-1 text-[12px] text-muted">
                  発行: {formatDateTime(item.issuedAt)} / 明細 {item.lineCount} 行
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {correcting ? (
        <section className="rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 text-[14px] font-semibold">訂正内容</h2>
          <form onSubmit={handleCorrect} className="space-y-4">
            {editLines.map((line, index) => (
              <div key={line.key} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[12px] text-muted">内容</label>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(index, { description: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] text-muted">数量</label>
                  <Input
                    type="number"
                    min={0}
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] text-muted">単価</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="mb-1 block text-[12px] text-muted">訂正理由（任意）</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="施設への通知に含まれます" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={acting}>訂正版を発行</Button>
              <Button type="button" variant="secondary" onClick={() => setCorrecting(false)}>
                キャンセル
              </Button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
