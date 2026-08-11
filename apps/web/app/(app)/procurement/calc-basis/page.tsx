"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { getScheduleCalcBasis } from "@/lib/api";
import type { ScheduleCalcBasis } from "@/lib/types";

type RefRow = ScheduleCalcBasis["references"][number];

const refColumns: DataTableColumn<RefRow>[] = [
  { key: "customerCode", header: "施設コード", render: (row) => row.customerCode ?? "—" },
  { key: "customerName", header: "施設名", render: (row) => row.customerName ?? "—" },
  { key: "referenceDate", header: "参照日", render: (row) => row.referenceDate },
  { key: "referenceQty", header: "参照数量", render: (row) => row.referenceQty },
  {
    key: "fallbackUsed",
    header: "フォールバック",
    render: (row) => (row.fallbackUsed ? "あり" : "—"),
  },
  { key: "ruleCode", header: "参照ルール", render: (row) => row.ruleCode ?? "—" },
  {
    key: "latestRice",
    header: "直近合数",
    render: (row) =>
      row.latestRice.quantity != null
        ? `${row.latestRice.quantity}（${row.latestRice.referenceDate ?? "—"}）`
        : "—",
  },
];

function CalcBasisContent() {
  const [scheduleId, setScheduleId] = useState("");
  const [data, setData] = useState<ScheduleCalcBasis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleId.trim()) {
      setError("発注スケジュールIDを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getScheduleCalcBasis(scheduleId.trim());
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="計算根拠の確認"
        description="発注スケジュールIDを指定して、参照データと合数フォールバックの根拠を確認します"
      />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}

      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-white p-4">
        <div>
          <label className="mb-1 block text-[12px] text-muted">発注スケジュールID</label>
          <Input value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} placeholder="例: 123" className="w-48" />
        </div>
        <Button type="submit" loading={loading}>確認</Button>
      </form>

      {data ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="mb-2 text-[14px] font-semibold">基本情報</h2>
            <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
              <div><dt className="text-muted">商品</dt><dd>{data.stockItem.name}（{data.stockItem.itemCode}）</dd></div>
              <div><dt className="text-muted">仕入業者</dt><dd>{data.supplier.name}</dd></div>
              <div><dt className="text-muted">納品日</dt><dd>{data.schedule.deliveryDate}</dd></div>
              <div><dt className="text-muted">発注量</dt><dd>{data.schedule.orderQuantity}</dd></div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="mb-3 text-[14px] font-semibold">参照内訳</h2>
            <DataTable columns={refColumns} rows={data.references} getRowKey={(row) => `${row.customerId}-${row.referenceDate}`} emptyMessage="参照データがありません" />
          </section>

          {data.calcSnapshot ? (
            <section className="rounded-lg border border-border bg-white p-4">
              <h2 className="mb-2 text-[14px] font-semibold">計算スナップショット</h2>
              <pre className="overflow-auto rounded-md bg-bg p-3 text-[12px]">{JSON.stringify(data.calcSnapshot, null, 2)}</pre>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function CalcBasisPage() {
  return (
    <InternalOnly>
      <CalcBasisContent />
    </InternalOnly>
  );
}
