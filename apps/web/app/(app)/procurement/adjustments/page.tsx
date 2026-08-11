"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionNavTabs } from "@/components/layout/SectionNavTabs";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { getMealCountAdjustments, getMealTypes, putMealCountAdjustments } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { MealCountAdjustmentItem, MealType } from "@/lib/types";

function AdjustmentsContent() {
  const [rows, setRows] = useState<MealCountAdjustmentItem[]>([]);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [customerId, setCustomerId] = useState("");
  const [serviceDateFrom, setServiceDateFrom] = useState("");
  const [serviceDateTo, setServiceDateTo] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [mealTypeId, setMealTypeId] = useState("");
  const [adjustMeals, setAdjustMeals] = useState("0");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getMealTypes({ pageSize: 200 })
      .then((res) => setMealTypes(res.items))
      .catch(() => setMealTypes([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMealCountAdjustments({
        customerId: customerId || undefined,
        serviceDateFrom: serviceDateFrom || undefined,
        serviceDateTo: serviceDateTo || undefined,
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
  }, [customerId, serviceDateFrom, serviceDateTo, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formCustomerId || !mealTypeId) {
      setError("施設IDと食事区分を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await putMealCountAdjustments({
        items: [
          {
            customerId: formCustomerId,
            serviceDate,
            mealTypeId,
            adjustMeals: Number(adjustMeals),
            reason: reason || undefined,
          },
        ],
      });
      setMessage("食数補正を登録しました");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<MealCountAdjustmentItem>[] = [
    { key: "serviceDate", header: "喫食日" },
    { key: "customerCode", header: "施設コード" },
    { key: "customerName", header: "施設名" },
    { key: "mealTypeName", header: "食事区分" },
    {
      key: "adjustMeals",
      header: "補正食数",
      render: (row) => (row.adjustMeals > 0 ? `+${row.adjustMeals}` : String(row.adjustMeals)),
    },
    { key: "reason", header: "理由", render: (row) => row.reason ?? "—" },
    { key: "version", header: "版" },
    { key: "updatedAt", header: "更新日時", render: (row) => formatDateTime(row.updatedAt) },
  ];

  return (
    <div>
      <PageHeader
        title="食数補正"
        description="発注計算に反映する食数の補正（±）を登録します"
      />
      <SectionNavTabs groupId="procurement-adjustments" />

      <section className="mb-4 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-text">補正登録</h2>
        <form onSubmit={handleSave} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="施設ID"
            value={formCustomerId}
            onChange={(e) => setFormCustomerId(e.target.value)}
            required
          />
          <Input
            label="喫食日"
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            required
          />
          <label className="block text-[13px]">
            <span className="mb-1 block text-[12px] text-muted">食事区分</span>
            <select
              className="w-full rounded-md border border-border px-3 py-2 text-[13px]"
              value={mealTypeId}
              onChange={(e) => setMealTypeId(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {mealTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.code} {type.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="補正食数（±）"
            type="number"
            value={adjustMeals}
            onChange={(e) => setAdjustMeals(e.target.value)}
            required
          />
          <Input
            label="理由（任意）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="sm:col-span-2"
          />
          <div className="flex items-end">
            <Button type="submit" loading={saving}>
              登録
            </Button>
          </div>
        </form>
      </section>

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          label="施設ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-40"
        />
        <Input type="date" value={serviceDateFrom} onChange={(e) => setServiceDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={serviceDateTo} onChange={(e) => setServiceDateTo(e.target.value)} className="w-40" />
        <Button type="button" variant="secondary" onClick={() => { setPage(1); load(); }}>
          絞り込み
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} emptyMessage="補正データがありません" />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}
    </div>
  );
}

export default function MealCountAdjustmentsPage() {
  return (
    <InternalOnly>
      <AdjustmentsContent />
    </InternalOnly>
  );
}
