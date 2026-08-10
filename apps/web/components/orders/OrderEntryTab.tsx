"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import {
  UnifiedOrderGrid,
  entryCellKey,
  type EntryCellEdit,
  type EntryCellKey,
} from "@/components/orders/UnifiedOrderGrid";
import {
  ApiError,
  addOrderEntryAllergenRow,
  getNewYearOrders,
  getOrderEntry,
  saveNewYearOrders,
  saveOrderEntry,
} from "@/lib/api";
import type { OrderEntryResponse, OrderEntryRow } from "@/lib/types";
import { WeeklyOrderGrid, cellKey, type CellEdit, type CellKey } from "@/components/orders/WeeklyOrderGrid";
import type { WeeklyOrdersResponse } from "@/lib/types";

type ConfirmSummary = {
  mealTotal: number;
  allergenTotal: number;
  riceTotal: number;
  orderTotal: number;
};

type Props = {
  customerId: string;
  weekStart: string;
  span: "week" | "month" | "new_year";
  onDirtyCountChange?: (count: number) => void;
  onDeadlineChange?: (deadlineAt: string | null, remainingSeconds: number | null) => void;
};

export function OrderEntryTab({ customerId, weekStart, span, onDirtyCountChange, onDeadlineChange }: Props) {
  const [data, setData] = useState<OrderEntryResponse | null>(null);
  const [newYearData, setNewYearData] = useState<WeeklyOrdersResponse | null>(null);
  const [newYearYear, setNewYearYear] = useState(() => String(new Date().getFullYear() + 1));
  const [newYearAccepting, setNewYearAccepting] = useState(false);
  const [edits, setEdits] = useState<Map<EntryCellKey, EntryCellEdit>>(new Map());
  const [newYearEdits, setNewYearEdits] = useState<Map<CellKey, CellEdit>>(new Map());
  const [failedKeys, setFailedKeys] = useState<Set<EntryCellKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSummary, setConfirmSummary] = useState<ConfirmSummary | null>(null);
  const [partialResultOpen, setPartialResultOpen] = useState(false);
  const [partialResult, setPartialResult] = useState<{
    saved: number;
    failedCount: number;
    mealTotal: number;
    allergenTotal: number;
    expectedTotal: number;
  } | null>(null);
  const [addAllergenUnitId, setAddAllergenUnitId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    setEdits(new Map());
    setFailedKeys(new Set());
    try {
      if (span === "new_year") {
        const res = await getNewYearOrders({ year: Number(newYearYear), customerId });
        setNewYearData(res.grid);
        setNewYearAccepting(res.accepting);
        onDeadlineChange?.(res.nextDeadline?.deadlineAt ?? null, res.nextDeadline?.remainingSeconds ?? null);
        setData(null);
      } else {
        const res = await getOrderEntry({ weekStart, customerId });
        setData(res);
        setNewYearData(null);
        onDeadlineChange?.(res.windowInfo?.deadlineAt ?? null, res.windowInfo?.remainingSeconds ?? null);
      }
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId, weekStart, span, newYearYear, onDeadlineChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onDirtyCountChange?.(span === "new_year" ? newYearEdits.size : edits.size);
  }, [edits.size, newYearEdits.size, span, onDirtyCountChange]);

  const allergenOptionsForUnit = useMemo(() => {
    if (!data || !addAllergenUnitId) return [];
    const existing = new Set(
      data.rows
        .filter((r) => r.rowType === "allergen" && r.unitId === addAllergenUnitId)
        .map((r) => r.allergenTypeId),
    );
    return data.allergenOptions.filter((o) => !existing.has(o.id));
  }, [data, addAllergenUnitId]);

  function buildConfirmSummary(): ConfirmSummary {
    if (!data) return { mealTotal: 0, allergenTotal: 0, riceTotal: 0, orderTotal: 0 };
    let mealTotal = 0;
    let allergenTotal = 0;
    let riceTotal = 0;
    for (const row of data.rows) {
      for (const cell of row.cells) {
        const key = entryCellKey(row, cell.date);
        const edit = edits.get(key);
        const qty = edit?.quantity ?? cell.quantity ?? 0;
        if (row.rowType === "meal") mealTotal += qty;
        else if (row.rowType === "allergen") allergenTotal += qty;
        else if (row.rowType === "rice") riceTotal += qty;
      }
    }
    return { mealTotal, allergenTotal, riceTotal, orderTotal: mealTotal + allergenTotal };
  }

  function handleCellChange(row: OrderEntryRow, date: string, cellEdit: EntryCellEdit, value: number) {
    const key = entryCellKey(row, date);
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(key, { ...cellEdit, quantity: value });
      return next;
    });
    setFailedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function buildSaveCells() {
    if (!data) return [];
    const cells = [];
    for (const [key, edit] of edits.entries()) {
      const lastColon = key.lastIndexOf(":");
      const rowKey = key.slice(0, lastColon);
      const serviceDate = key.slice(lastColon + 1);
      const row = data.rows.find((r) => r.rowKey === rowKey);
      if (!row) continue;
      const cell = row.cells.find((c) => c.date === serviceDate);
      cells.push({
        rowType: row.rowType,
        rowKey: row.rowKey,
        unitId: row.unitId,
        serviceDate,
        quantity: edit.quantity,
        version: edit.version,
        mealTypeId: row.mealTypeId,
        menuKindId: row.menuKindId,
        allergenTypeId: row.allergenTypeId,
        riceType: row.riceType,
        orderId: edit.orderId ?? cell?.orderId ?? null,
      });
    }
    return cells;
  }

  async function handleSave(commit: boolean) {
    if (span === "new_year") {
      if (!newYearData || newYearEdits.size === 0) return;
      setSaving(true);
      setError(null);
      const cells = [...newYearEdits.entries()].map(([key, edit]) => {
        const [unitId, mealTypeId, menuKindId, serviceDate] = key.split(":");
        return { unitId, serviceDate, mealTypeId, menuKindId, quantity: edit.quantity, version: edit.version };
      });
      try {
        const result = await saveNewYearOrders({
          year: Number(newYearYear),
          customerId,
          commit,
          cells,
        });
        setMessage(commit ? `元旦注文を確定しました（${result.saved}件）` : `下書きを保存しました（${result.saved}件）`);
        setConfirmOpen(false);
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "保存に失敗しました");
      } finally {
        setSaving(false);
      }
      return;
    }

    const cells = buildSaveCells();
    if (cells.length === 0) {
      setMessage("変更はありません");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await saveOrderEntry({ customerId, commit, cells });
      const expected = confirmSummary?.orderTotal ?? buildConfirmSummary().orderTotal;
      if (result.failed.length > 0) {
        const failedSet = new Set<EntryCellKey>();
        for (const f of result.failed) {
          for (const [key] of edits.entries()) {
            if (key.includes(f.key.split(":").slice(-1)[0] ?? "")) failedSet.add(key);
          }
        }
        setFailedKeys(failedSet);
        setPartialResult({
          saved: result.saved,
          failedCount: result.failed.length,
          mealTotal: result.mealTotal,
          allergenTotal: result.allergenTotal,
          expectedTotal: expected,
        });
        setPartialResultOpen(true);
      } else {
        setMessage(commit ? `注文を確定しました（${result.saved}件）` : `下書きを保存しました（${result.saved}件）`);
        setConfirmOpen(false);
        await load();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAllergen(allergenTypeId: string) {
    if (!customerId || !addAllergenUnitId) return;
    setSaving(true);
    try {
      const res = await addOrderEntryAllergenRow({
        customerId,
        weekStart,
        unitId: addAllergenUnitId,
        allergenTypeId,
      });
      setData(res);
      setAddAllergenUnitId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (!customerId) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
        施設を選択してください。
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => handleSave(false)} loading={saving} disabled={edits.size === 0 && newYearEdits.size === 0}>
          下書き保存
        </Button>
        <Button
          onClick={() => {
            if (span !== "new_year") {
              setConfirmSummary(buildConfirmSummary());
            }
            setConfirmOpen(true);
          }}
          loading={saving}
          disabled={edits.size === 0 && newYearEdits.size === 0}
        >
          <Save className="h-3.5 w-3.5" />
          この内容で注文する
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => handleSave(true)}
        title="注文数の確認"
        confirmLabel="この内容で注文する"
        loading={saving}
        message={
          confirmSummary ? (
            <div className="space-y-2">
              <p className="text-[15px] font-semibold text-text">
                注文数は {confirmSummary.orderTotal} で間違いないですか？
              </p>
              <p className="text-[12px] text-muted">
                通常食 {confirmSummary.mealTotal} ・ アレルギー {confirmSummary.allergenTotal}
              </p>
              {confirmSummary.riceTotal > 0 ? (
                <p className="text-[12px] text-muted">混ぜご飯 {confirmSummary.riceTotal} 合（食数合計には含みません）</p>
              ) : null}
            </div>
          ) : (
            <p>この内容で元旦注文を確定しますか？</p>
          )
        }
      />

      <Modal open={partialResultOpen} onClose={() => setPartialResultOpen(false)} title="保存結果">
        {partialResult ? (
          <div className="space-y-3 text-[13px]">
            <p>
              確認した注文数: <strong>{partialResult.expectedTotal}</strong> / 保存できた件数:{" "}
              <strong>{partialResult.saved}</strong>
            </p>
            <p className="text-danger">{partialResult.failedCount} 件は保存できませんでした。赤枠のセルを確認してください。</p>
            <p className="text-muted">
              通常食 {partialResult.mealTotal} ・ アレルギー {partialResult.allergenTotal}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPartialResultOpen(false)}>
                修正する
              </Button>
              <Button
                onClick={async () => {
                  setPartialResultOpen(false);
                  await load();
                }}
              >
                この内容で確定を維持
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={addAllergenUnitId !== null} onClose={() => setAddAllergenUnitId(null)} title="アレルギー行を追加">
        <div className="space-y-2">
          {allergenOptionsForUnit.length === 0 ? (
            <p className="text-[13px] text-muted">追加できるアレルギー種類がありません。</p>
          ) : (
            allergenOptionsForUnit.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="block w-full rounded-md border border-border px-3 py-2 text-left text-[13px] hover:bg-bg"
                onClick={() => handleAddAllergen(opt.id)}
              >
                {opt.code} {opt.name}
              </button>
            ))
          )}
        </div>
      </Modal>

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

      {span === "new_year" && !newYearAccepting && !loading ? (
        <Alert variant="warning" className="mb-4">
          現在、元旦注文の受付期間外です。
        </Alert>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : span === "new_year" && newYearData && newYearAccepting ? (
        <WeeklyOrderGrid
          data={newYearData}
          edits={newYearEdits}
          onCellChange={(row, date, cellEdit, value) => {
            const key = cellKey(row, date);
            setNewYearEdits((prev) => {
              const next = new Map(prev);
              next.set(key, { ...cellEdit, quantity: value });
              return next;
            });
          }}
        />
      ) : data && data.rows.length > 0 ? (
        <UnifiedOrderGrid
          dates={data.dates}
          rows={data.rows}
          edits={edits}
          failedKeys={failedKeys}
          onCellChange={handleCellChange}
          onAddAllergen={setAddAllergenUnitId}
        />
      ) : !error ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          表示するデータがありません。施設・ユニットのマスタ設定を確認してください。
        </div>
      ) : null}
    </div>
  );
}
