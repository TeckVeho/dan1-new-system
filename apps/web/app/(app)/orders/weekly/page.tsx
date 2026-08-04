"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, getOrderWindows, getWeeklyOrders, saveWeeklyOrders } from "@/lib/api";
import { addDays, formatDateTime, formatRemaining, toWeekStart } from "@/lib/utils";
import type { OrderWindowInfo, WeeklyOrderRow, WeeklyOrdersResponse } from "@/lib/types";
import { WeeklyOrderGrid, cellKey, type CellEdit, type CellKey } from "@/components/orders/WeeklyOrderGrid";

export default function WeeklyOrdersPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => toWeekStart(new Date()));
  const [customerId, setCustomerId] = useState("");
  const [data, setData] = useState<WeeklyOrdersResponse | null>(null);
  const [windowInfo, setWindowInfo] = useState<OrderWindowInfo | null>(null);
  const [edits, setEdits] = useState<Map<CellKey, CellEdit>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEdits(new Map());
    try {
      const params = { weekStart, customerId: user.type === "internal" ? customerId || undefined : undefined };
      const [orders, windowRes] = await Promise.all([
        getWeeklyOrders(params),
        getOrderWindows({
          orderType: "provisional",
          from: weekStart,
          to: weekEnd,
          customerId: params.customerId,
        }),
      ]);
      setData(orders);
      setWindowInfo(windowRes);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, customerId, user.type]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCellChange(row: WeeklyOrderRow, date: string, cellEdit: CellEdit, value: number) {
    const key = cellKey(row, date);
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(key, { ...cellEdit, quantity: value });
      return next;
    });
  }

  async function handleSave(commit: boolean) {
    if (!data || edits.size === 0) {
      if (edits.size === 0) setMessage("変更はありません");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    const cells = [...edits.entries()].map(([key, edit]) => {
      const [unitId, mealTypeId, menuKindId, serviceDate] = key.split(":");
      return {
        unitId,
        serviceDate,
        mealTypeId,
        menuKindId,
        quantity: edit.quantity,
        version: edit.version,
      };
    });

    try {
      const result = await saveWeeklyOrders({
        weekStart,
        customerId: user.type === "internal" ? customerId || undefined : undefined,
        commit,
        cells,
      });
      setMessage(commit ? `注文を確定しました（${result.saved}件）` : `下書きを保存しました（${result.saved}件）`);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.code === "DEADLINE_EXCEEDED") {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="週間注文入力"
        description="ユニット・食事区分・献立種類ごとに1週間分の食数を入力します"
        actions={
          <>
            <Button variant="secondary" onClick={() => handleSave(false)} loading={saving} disabled={edits.size === 0}>
              下書き保存
            </Button>
            <Button onClick={() => handleSave(true)} loading={saving} disabled={edits.size === 0}>
              <Save className="h-3.5 w-3.5" />
              この内容で注文する
            </Button>
          </>
        }
      />

      {windowInfo ? (
        <Alert
          variant={windowInfo.remainingSeconds < 3600 * 24 ? "warning" : "info"}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            次回締切: {formatDateTime(windowInfo.deadlineAt)}（{formatRemaining(windowInfo.remainingSeconds)}）
          </span>
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
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="md" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="h-3.5 w-3.5" />
            前週
          </Button>
          <span className="px-2 text-[13px] font-medium text-text">
            {weekStart} 〜 {weekEnd}
          </span>
          <Button variant="secondary" size="md" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            翌週
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="md" onClick={() => setWeekStart(toWeekStart(new Date()))}>
            今週
          </Button>
        </div>

        {user.type === "internal" ? (
          <div className="w-48">
            <Input
              placeholder="施設ID（未指定で全体）"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : data && data.rows.length > 0 ? (
        <WeeklyOrderGrid data={data} edits={edits} onCellChange={handleCellChange} />
      ) : !error ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          表示するデータがありません。施設・ユニットのマスタ設定を確認してください。
        </div>
      ) : null}
    </div>
  );
}
