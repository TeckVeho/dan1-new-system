"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterChip } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { MonthCalendar } from "@/components/ui/month-calendar";
import { getOrderSummary, getOrderWindowsFull } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

type Layer = "quantity" | "deadline";

type Props = {
  customerId: string;
  monthAnchor: string;
  onNavigateWeek?: (weekStart: string) => void;
};

function monthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function OrderCalendarTab({ customerId, monthAnchor, onNavigateWeek }: Props) {
  const [layer, setLayer] = useState<Layer>("quantity");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityByDate, setQuantityByDate] = useState<Map<string, number>>(new Map());
  const [deadlineDays, setDeadlineDays] = useState<
    Array<{ date: string; label: string; className?: string }>
  >([]);

  const anchor = new Date(monthAnchor);
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const { from, to } = useMemo(() => monthRange(year, month), [year, month]);

  const load = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summary, windows] = await Promise.all([
        getOrderSummary({ customerId, serviceDateFrom: from, serviceDateTo: to, groupBy: "day" }),
        getOrderWindowsFull({ customerId, orderType: "provisional", from, to }),
      ]);
      const qMap = new Map<string, number>();
      for (const r of summary.rows) {
        if ("date" in r) qMap.set(r.date, r.total);
      }
      setQuantityByDate(qMap);
      setDeadlineDays(
        windows.windows.map((w) => {
          const past = w.deadlineAt ? new Date(w.deadlineAt).getTime() < Date.now() : false;
          const soon =
            w.deadlineAt ? new Date(w.deadlineAt).getTime() - Date.now() < 86400000 && !past : false;
          return {
            date: w.serviceDate,
            label: w.deadlineAt ? formatDateTime(w.deadlineAt) : "—",
            className: past ? "bg-danger/5" : soon ? "bg-warning/10" : undefined,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  if (!customerId) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
        施設を選択してください。
      </div>
    );
  }

  const calendarDays =
    layer === "quantity"
      ? [...quantityByDate.entries()].map(([date, total]) => ({
          date,
          label: `${total}食`,
          onClick: onNavigateWeek
            ? () => {
                const d = new Date(date);
                const day = d.getDay();
                const diff = day === 0 ? -6 : 1 - day;
                d.setDate(d.getDate() + diff);
                onNavigateWeek(d.toISOString().slice(0, 10));
              }
            : undefined,
        }))
      : deadlineDays;

  return (
    <div>
      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 flex gap-1.5">
        <FilterChip active={layer === "quantity"} onClick={() => setLayer("quantity")} label="食数" />
        <FilterChip active={layer === "deadline"} onClick={() => setLayer("deadline")} label="締切" />
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <MonthCalendar year={year} month={month} days={calendarDays} />
      )}
    </div>
  );
}
