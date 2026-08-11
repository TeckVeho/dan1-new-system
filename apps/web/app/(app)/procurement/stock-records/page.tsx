"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { createStockRecord, getStockRecords } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { StockRecordItem } from "@/lib/types";

function StockRecordsContent() {
  const [rows, setRows] = useState<StockRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [recordDateFrom, setRecordDateFrom] = useState("");
  const [recordDateTo, setRecordDateTo] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStockRecords({
        stockItemId: stockItemId || undefined,
        recordDateFrom: recordDateFrom || undefined,
        recordDateTo: recordDateTo || undefined,
        page,
        perPage: pageSize,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [stockItemId, recordDateFrom, recordDateTo, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!stockItemId || !quantity) {
      setError("在庫品目IDと数量を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await createStockRecord({
        stockItemId,
        recordDate,
        quantity: Number(quantity),
        recordType: "inventory",
      });
      setMessage("棚卸を登録しました");
      setQuantity("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<StockRecordItem>[] = [
    { key: "recordDate", header: "記録日" },
    { key: "stockItemCode", header: "品目コード" },
    { key: "stockItemName", header: "品目名" },
    { key: "quantity", header: "数量", render: (row) => `${row.quantity} ${row.unit}` },
    { key: "recordType", header: "種別" },
    { key: "createdBy", header: "登録者" },
    { key: "createdAt", header: "登録日時", render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="棚卸" description="実在庫を入力し、結果を一覧します" />

      <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-text">棚卸登録</h2>
        <form onSubmit={handleCreate} className="mt-3 grid gap-3 sm:grid-cols-4">
          <Input label="在庫品目ID" value={stockItemId} onChange={(e) => setStockItemId(e.target.value)} />
          <Input label="記録日" type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
          <Input label="数量" type="number" min={0} step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>
              {saving ? "登録中…" : "登録"}
            </Button>
          </div>
        </form>
      </section>

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input type="date" value={recordDateFrom} onChange={(e) => setRecordDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={recordDateTo} onChange={(e) => setRecordDateTo(e.target.value)} className="w-40" />
        <Button type="button" variant="secondary" onClick={() => { setPage(1); load(); }}>
          絞り込み
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">読み込み中…</div>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} emptyMessage="棚卸記録がありません" />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}
    </div>
  );
}

export default function StockRecordsPage() {
  return (
    <InternalOnly>
      <StockRecordsContent />
    </InternalOnly>
  );
}
