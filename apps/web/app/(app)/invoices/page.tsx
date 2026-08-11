"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import { closeInvoices, getCustomers, getInvoices, previewInvoices } from "@/lib/api";
import type { Customer, InvoiceClosePreview, InvoiceItem, InvoiceStatus } from "@/lib/types";
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

const SKIP_LABELS: Record<string, string> = {
  existing_draft: "下書きあり",
  no_orders: "注文なし",
  no_priced_lines: "単価未設定",
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function InvoicesPage() {
  const { user, can } = useAuth();
  const [rows, setRows] = useState<InvoiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [invoiceMonth, setInvoiceMonth] = useState(currentMonth());
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [showClosePanel, setShowClosePanel] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<InvoiceClosePreview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoices({
        page,
        perPage: pageSize,
        invoiceMonth: invoiceMonth || undefined,
        status: status || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, invoiceMonth, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!can("invoice.close")) return;
    getCustomers({ pageSize: 500 })
      .then((res) => setCustomers(res.items.filter((c) => c.isActive !== false && !c.isInternalTest)))
      .catch(() => setCustomers([]));
  }, [can]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.customerCode.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.id.includes(q),
    );
  }, [customers, customerSearch]);

  const allFilteredSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedCustomerIds.includes(c.id));

  function toggleCustomer(id: string) {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
    setPreview(null);
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredCustomers.map((c) => c.id));
      setSelectedCustomerIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const merged = new Set([...selectedCustomerIds, ...filteredCustomers.map((c) => c.id)]);
      setSelectedCustomerIds([...merged]);
    }
    setPreview(null);
  }

  async function handlePreview() {
    if (!invoiceMonth) return;
    setPreviewing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await previewInvoices({
        invoiceMonth,
        customerIds: selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined,
      });
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "プレビューに失敗しました");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleClose() {
    if (!invoiceMonth) return;
    const targetCount = preview?.creatableCount ?? selectedCustomerIds.length;
    if (
      !window.confirm(
        `${invoiceMonth} の請求を締めますか？${targetCount > 0 ? `（${targetCount} 施設）` : ""}`,
      )
    ) {
      return;
    }
    setClosing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await closeInvoices({
        invoiceMonth,
        customerIds: selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined,
      });
      setMessage(`${result.createdCount} 件の下書き請求を作成しました`);
      setPreview(null);
      setShowClosePanel(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "締め処理に失敗しました");
    } finally {
      setClosing(false);
    }
  }

  const columns: DataTableColumn<InvoiceItem>[] = [
    {
      key: "invoiceMonth",
      header: "請求月",
      render: (row) => row.invoiceMonth,
    },
    ...(user.type === "internal"
      ? [
          {
            key: "customer",
            header: "施設",
            render: (row: InvoiceItem) => row.customer?.name ?? row.customerId,
          } as DataTableColumn<InvoiceItem>,
        ]
      : []),
    {
      key: "status",
      header: "状態",
      render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABELS[row.status]}</Badge>,
    },
    {
      key: "version",
      header: "版",
      render: (row) => `v${row.version}`,
    },
    {
      key: "totalAmount",
      header: "合計（税込）",
      render: (row) => `¥${formatNumber(row.totalAmount)}`,
    },
    {
      key: "issuedAt",
      header: "発行日時",
      render: (row) => formatDateTime(row.issuedAt),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link href={`/invoices/${row.id}`} className="text-[13px] text-primary hover:underline">
          詳細
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="請求"
        description={
          user.type === "internal"
            ? "請求の締め・発行・訂正を行います"
            : "発行済みの請求書を確認できます"
        }
        actions={
          can("invoice.close") ? (
            <Button type="button" variant="secondary" onClick={() => setShowClosePanel((v) => !v)}>
              {showClosePanel ? "締めパネルを閉じる" : "請求締め"}
            </Button>
          ) : undefined
        }
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" title="完了" className="mb-4">{message}</Alert> : null}

      {showClosePanel && can("invoice.close") ? (
        <section className="mb-4 rounded-lg border border-border bg-white p-4">
          <h2 className="text-[15px] font-semibold">請求締め</h2>
          <p className="mt-1 text-[13px] text-muted">
            施設を選択してプレビュー後、締め処理を実行します。未選択の場合は全施設が対象です。
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Input
              label="請求月"
              type="month"
              value={invoiceMonth}
              onChange={(e) => {
                setInvoiceMonth(e.target.value);
                setPreview(null);
              }}
            />
            <Input
              label="施設検索"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="コード・名称"
            />
            <div className="flex items-end gap-2">
              <Button type="button" variant="secondary" onClick={toggleAllFiltered}>
                {allFilteredSelected ? "表示分を解除" : "表示分を全選択"}
              </Button>
              <span className="text-[12px] text-muted">{selectedCustomerIds.length} 施設選択中</span>
            </div>
          </div>

          <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-border">
            {filteredCustomers.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-muted">施設がありません</p>
            ) : (
              <ul>
                {filteredCustomers.map((customer) => (
                  <li key={customer.id} className="border-b border-border last:border-b-0">
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.includes(customer.id)}
                        onChange={() => toggleCustomer(customer.id)}
                      />
                      <span>{customer.customerCode}</span>
                      <span>{customer.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" loading={previewing} onClick={handlePreview}>
              プレビュー
            </Button>
            <Button type="button" loading={closing} disabled={!invoiceMonth} onClick={handleClose}>
              締め実行
            </Button>
          </div>

          {preview ? (
            <div className="mt-4 rounded-md border border-border bg-surface-subtle p-3">
              <p className="text-[13px]">
                作成可能 {preview.creatableCount} 件 / スキップ {preview.skippedCount} 件 /
                合計 ¥{formatNumber(preview.totalAmount)}（税込）
              </p>
              <div className="mt-2 max-h-56 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-1 pr-2">施設</th>
                      <th className="py-1 pr-2">状態</th>
                      <th className="py-1 pr-2">明細数</th>
                      <th className="py-1">合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item) => (
                      <tr key={item.customerId} className="border-t border-border">
                        <td className="py-1 pr-2">{item.customerCode} {item.customerName}</td>
                        <td className="py-1 pr-2">
                          {item.skipReason ? SKIP_LABELS[item.skipReason] ?? item.skipReason : "作成可"}
                        </td>
                        <td className="py-1 pr-2">{item.lines.length}</td>
                        <td className="py-1">¥{formatNumber(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[12px] text-muted">請求月</label>
          <Input
            type="month"
            value={invoiceMonth}
            onChange={(e) => {
              setPage(1);
              setInvoiceMonth(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-muted">状態</label>
          <select
            className="h-9 rounded-md border border-border bg-white px-3 text-[13px]"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">すべて</option>
            <option value="draft">下書き</option>
            <option value="issued">発行済</option>
            <option value="corrected">訂正済</option>
          </select>
        </div>
        <Button variant="secondary" type="button" onClick={load}>
          再読み込み
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={loading}
        emptyMessage="請求データがありません"
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
      />
    </div>
  );
}
