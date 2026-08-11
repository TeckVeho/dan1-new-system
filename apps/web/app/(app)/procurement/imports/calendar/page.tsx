"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionNavTabs } from "@/components/layout/SectionNavTabs";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getImportCalendar } from "@/lib/api";
import type { ImportCalendarDay } from "@/lib/types";

const STATUS_VARIANT: Record<string, "success" | "danger" | "primary" | "muted"> = {
  completed: "success",
  failed: "danger",
  running: "primary",
  queued: "muted",
};

function ImportCalendarContent() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [days, setDays] = useState<ImportCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<ImportCalendarDay | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getImportCalendar({ month });
      setDays(res.days);
      setSelectedDay(res.days[0] ?? null);
    } catch (e) {
      setDays([]);
      setSelectedDay(null);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const calendarCells = useMemo(() => {
    const [year, mon] = month.split("-").map(Number);
    const first = new Date(Date.UTC(year!, mon! - 1, 1));
    const lastDate = new Date(Date.UTC(year!, mon!, 0)).getUTCDate();
    const startWeekday = first.getUTCDay();
    const cells: Array<{ date: string | null; day?: ImportCalendarDay }> = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push({ date: null });
    for (let d = 1; d <= lastDate; d += 1) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      cells.push({ date, day: dayMap.get(date) });
    }
    return cells;
  }, [month, dayMap]);

  return (
    <div>
      <PageHeader title="取込状況カレンダー" description="取込済み・未取込を日ごとに一覧します" />
      <SectionNavTabs groupId="procurement-imports" />

      <div className="mb-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
      </div>

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">読み込み中…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-lg border border-border bg-white p-4">
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-muted">
              {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                if (!cell.date) return <div key={`empty-${idx}`} />;
                const date = cell.date;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() =>
                      setSelectedDay(
                        cell.day ?? {
                          date,
                          total: 0,
                          completed: 0,
                          failed: 0,
                          running: 0,
                          queued: 0,
                          batches: [],
                        },
                      )
                    }
                    className={`min-h-20 rounded-md border p-2 text-left text-[12px] ${
                      selectedDay?.date === date ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="font-medium">{Number(date.slice(-2))}</div>
                    {cell.day && cell.day.total > 0 ? (
                      <div className="mt-1 space-y-0.5 text-[10px] text-muted">
                        <div>計 {cell.day.total}</div>
                        {cell.day.failed > 0 ? <div className="text-danger">失敗 {cell.day.failed}</div> : null}
                      </div>
                    ) : (
                      <div className="mt-1 text-[10px] text-muted">—</div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-4">
            <h2 className="text-[15px] font-semibold text-text">{selectedDay?.date ?? "—"} の取込</h2>
            {selectedDay && selectedDay.batches.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {selectedDay.batches.map((batch) => (
                  <li key={batch.id} className="rounded-md border border-border px-3 py-2 text-[12px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{batch.supplierName}</span>
                      <Badge variant={STATUS_VARIANT[batch.status] ?? "muted"}>{batch.status}</Badge>
                    </div>
                    <div className="mt-1 text-muted">{batch.fileType}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-muted">この日の取込はありません</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function ImportCalendarPage() {
  return (
    <InternalOnly>
      <ImportCalendarContent />
    </InternalOnly>
  );
}
