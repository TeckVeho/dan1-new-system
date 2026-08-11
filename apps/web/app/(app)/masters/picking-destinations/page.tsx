"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { deletePickingDestination, getPickingDestinations, upsertPickingDestination } from "@/lib/api";
import type { PickingDestinationItem } from "@/lib/types";

const DESTINATION_LABELS: Record<string, string> = {
  regular_menu: "通常献立",
  allergen_menu: "アレルギー献立",
  pouch: "パウチ",
  other: "その他",
};

const columns: DataTableColumn<PickingDestinationItem>[] = [
  { key: "item", header: "商品", render: (row) => row.stockItem?.name ?? row.stockItemId },
  { key: "supplier", header: "仕入業者", render: (row) => row.stockItem?.supplier?.name ?? "—" },
  {
    key: "destination",
    header: "出力先",
    render: (row) => DESTINATION_LABELS[row.destination] ?? row.destination,
  },
  { key: "note", header: "備考", render: (row) => row.note ?? "—" },
];

function PickingDestinationsContent() {
  const [rows, setRows] = useState<PickingDestinationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stockItemId, setStockItemId] = useState("");
  const [destination, setDestination] = useState<"regular_menu" | "allergen_menu" | "pouch" | "other">("regular_menu");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPickingDestinations({ page, perPage: pageSize });
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!stockItemId.trim()) {
      setError("商品IDを入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await upsertPickingDestination({
        stockItemId: stockItemId.trim(),
        destination,
        note: note || undefined,
      });
      setMessage("出力先を保存しました");
      setStockItemId("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この出力先設定を削除しますか？")) return;
    try {
      await deletePickingDestination(id);
      setMessage("削除しました");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  return (
    <div>
      <PageHeader title="ピッキング出力先" description="商品ごとのピッキング出力先を設定します（仮仕様）" />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" title="完了" className="mb-4">{message}</Alert> : null}

      <form onSubmit={handleSave} className="mb-4 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] text-muted">商品ID *</label>
          <Input value={stockItemId} onChange={(e) => setStockItemId(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-muted">出力先 *</label>
          <select
            className="h-9 w-full rounded-md border border-border bg-white px-3 text-[13px]"
            value={destination}
            onChange={(e) => setDestination(e.target.value as typeof destination)}
          >
            {Object.entries(DESTINATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[12px] text-muted">備考</label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" loading={saving}>保存</Button>
        </div>
      </form>

      <DataTable
        columns={[
          ...columns,
          {
            key: "actions",
            header: "",
            render: (row) => (
              <Button variant="secondary" type="button" onClick={() => handleDelete(row.stockItemId)}>
                削除
              </Button>
            ),
          },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage={loading ? "読み込み中…" : "設定がありません"}
      />
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}

export default function PickingDestinationsPage() {
  return (
    <InternalOnly>
      <PickingDestinationsContent />
    </InternalOnly>
  );
}
