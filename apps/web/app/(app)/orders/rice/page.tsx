"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, getOrderUnits, getOrderWindows, getRiceOrders, saveRiceOrders } from "@/lib/api";
import { addDays, formatDateTime, formatRemaining, toWeekStart } from "@/lib/utils";
import type { OrderWindowInfo, RiceOrder, Unit } from "@/lib/types";

type DraftRow = {
  key: string;
  unitId: string;
  serviceDate: string;
  riceType: string;
  quantity: number;
  version: number | null;
  isNew: boolean;
};

function newDraftRow(): DraftRow {
  return {
    key: `new-${Date.now()}-${Math.random()}`,
    unitId: "",
    serviceDate: "",
    riceType: "mix",
    quantity: 0,
    version: null,
    isNew: true,
  };
}

function toDraftRow(row: RiceOrder): DraftRow {
  return {
    key: row.id,
    unitId: row.unitId,
    serviceDate: row.serviceDate.slice(0, 10),
    riceType: row.riceType,
    quantity: row.quantity,
    version: row.version,
    isNew: false,
  };
}

export default function RiceOrdersPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => toWeekStart(new Date()));
  const [customerId, setCustomerId] = useState(user.customerId ?? "");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [windowInfo, setWindowInfo] = useState<OrderWindowInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const scopedCustomerId = user.type === "internal" ? customerId || user.customerId : user.customerId;

  const load = useCallback(async () => {
    if (user.type === "internal" && !scopedCustomerId) {
      setLoading(false);
      setRows([]);
      setUnits([]);
      setWindowInfo(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [orders, unitRes, windowRes] = await Promise.all([
        getRiceOrders({ customerId: scopedCustomerId || undefined, dateFrom: weekStart, dateTo: weekEnd }),
        getOrderUnits({ customerId: scopedCustomerId || undefined }),
        getOrderWindows({
          orderType: "rice",
          from: weekStart,
          to: weekEnd,
          customerId: scopedCustomerId || undefined,
        }),
      ]);
      setRows(orders.length > 0 ? orders.map(toDraftRow) : [newDraftRow(), newDraftRow(), newDraftRow(), newDraftRow()]);
      setUnits(unitRes);
      setWindowInfo(windowRes);
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

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (rows.length >= 1000) return;
    setRows((prev) => [...prev, newDraftRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  }

  async function handleSave(commit: boolean) {
    if (!scopedCustomerId) return;
    const cells = rows
      .filter((row) => row.unitId && row.serviceDate && row.riceType)
      .map((row) => ({
        unitId: row.unitId,
        serviceDate: row.serviceDate,
        riceType: row.riceType,
        quantity: row.quantity,
        version: row.version,
      }));
    if (cells.length === 0) {
      setError("保存する行を入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await saveRiceOrders({ customerId: scopedCustomerId, commit, cells });
      setMessage(commit ? `合数を登録しました（${result.saved}件）` : `下書きを保存しました（${result.saved}件）`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const unitName = (unitId: string) => units.find((u) => u.id === unitId)?.name ?? unitId;

  return (
    <div>
      <PageHeader
        title="混ぜご飯の合数指定"
        description="喫食日・ユニットごとに混ぜご飯の合数を入力します"
        actions={
          <>
            <Button variant="secondary" onClick={() => handleSave(false)} loading={saving}>
              下書き保存
            </Button>
            <Button onClick={() => handleSave(true)} loading={saving}>
              <Save className="h-3.5 w-3.5" />
              登録する
            </Button>
          </>
        }
      />

      {windowInfo ? (
        <Alert variant="info" className="mb-4">
          登録・変更可能期間: {windowInfo.serviceDateFrom} 〜 {windowInfo.serviceDateTo}
          （締切: {formatDateTime(windowInfo.deadlineAt)}・残り {formatRemaining(windowInfo.remainingSeconds)}）
        </Alert>
      ) : null}

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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="w-40" />
          <span className="text-muted">〜</span>
          <Input type="date" value={weekEnd} onChange={(e) => setWeekStart(addDays(e.target.value, -6))} className="w-40" />
        </div>
        {user.type === "internal" ? (
          <Input
            placeholder="施設ID（数値・必須）"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-56"
          />
        ) : null}
        <Button variant="secondary" onClick={addRow} disabled={rows.length >= 1000}>
          <Plus className="h-3.5 w-3.5" />
          行を追加
        </Button>
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
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="min-w-full text-[13px]">
            <thead className="border-b border-border bg-bg text-left text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">ユニット</th>
                <th className="px-3 py-2 font-medium">喫食日</th>
                <th className="px-3 py-2 font-medium">種別</th>
                <th className="px-3 py-2 font-medium">合数</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <select
                      className="w-full rounded-md border border-border px-2 py-1.5"
                      value={row.unitId}
                      onChange={(e) => updateRow(row.key, { unitId: e.target.value })}
                    >
                      <option value="">選択</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                    {row.unitId && !row.isNew ? (
                      <p className="mt-0.5 text-[11px] text-muted">{unitName(row.unitId)}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      value={row.serviceDate}
                      min={weekStart}
                      max={weekEnd}
                      onChange={(e) => updateRow(row.key, { serviceDate: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.riceType}
                      placeholder="mix"
                      onChange={(e) => updateRow(row.key, { riceType: e.target.value })}
                      className="w-28"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                      className="w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button type="button" variant="ghost" onClick={() => removeRow(row.key)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
