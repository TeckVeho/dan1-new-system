"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, getAllergenOrders, getMasterList, updateAllergenOrder } from "@/lib/api";
import { addDays, toWeekStart } from "@/lib/utils";
import type { AllergenOrder, Unit } from "@/lib/types";

type EditState = { quantity: number };

export default function AllergenOrdersPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => toWeekStart(new Date()));
  const [customerId, setCustomerId] = useState(user.customerId ?? "");
  const [rows, setRows] = useState<AllergenOrder[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const scopedCustomerId = user.type === "internal" ? customerId || user.customerId : user.customerId;

  const load = useCallback(async () => {
    if (user.type === "internal" && !scopedCustomerId) {
      setLoading(false);
      setRows([]);
      setUnits([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [orders, unitRes] = await Promise.all([
        getAllergenOrders({ customerId: scopedCustomerId || undefined, dateFrom: weekStart, dateTo: weekEnd }),
        getMasterList<Unit>("units", { customerId: scopedCustomerId || undefined, pageSize: 200 }),
      ]);
      setRows(orders);
      setUnits(unitRes.items);
      setEdits({});
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, scopedCustomerId, user.type]);

  useEffect(() => {
    load();
  }, [load]);

  const unitName = (unitId: string) => units.find((u) => u.id === unitId)?.name ?? unitId;

  async function handleSave(row: AllergenOrder) {
    const edit = edits[row.id];
    if (!edit) return;
    setSavingId(row.id);
    setError(null);
    try {
      await updateAllergenOrder(row.id, { quantity: edit.quantity, version: row.version });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  const columns: DataTableColumn<AllergenOrder>[] = [
    { key: "serviceDate", header: "喫食日", render: (row) => row.serviceDate.slice(0, 10) },
    { key: "unit", header: "ユニット", render: (row) => unitName(row.unitId) },
    {
      key: "allergen",
      header: "アレルギー種類",
      render: (row) => row.allergenType?.name ?? row.allergenTypeId,
    },
    {
      key: "quantity",
      header: "食数",
      render: (row) => (
        <Input
          type="number"
          min={0}
          className="w-24"
          value={edits[row.id]?.quantity ?? row.quantity}
          onChange={(e) =>
            setEdits((prev) => ({
              ...prev,
              [row.id]: { quantity: Number(e.target.value) },
            }))
          }
        />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        edits[row.id] ? (
          <Button size="md" loading={savingId === row.id} onClick={() => handleSave(row)}>
            <Save className="h-3.5 w-3.5" />
            保存
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="アレルギー注文（変更）"
        description="登録済みのアレルギー対応食の食数を変更します"
        actions={
          <Link
            href="/orders/allergen/new"
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-[13px] font-medium text-white hover:bg-primary-hover"
          >
            新規注文へ
          </Link>
        }
      />

      <Alert variant="info" className="mb-4">
        アレルギーの食数は通常の食数に追加注文する形となります。
      </Alert>

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="w-40" />
        <span className="text-[13px] text-muted">〜 {weekEnd}</span>
        {user.type === "internal" ? (
          <Input
            placeholder="施設ID（数値・必須）"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-56"
          />
        ) : null}
      </div>

      {user.type === "internal" && !scopedCustomerId ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          施設IDを入力するか、施設ユーザーでログインしてください。
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} emptyMessage="該当するアレルギー注文がありません" />
      )}
    </div>
  );
}
