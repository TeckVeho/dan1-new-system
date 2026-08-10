"use client";

import { cn } from "@/lib/utils";

export type MonthCalendarDay = {
  date: string;
  label?: string;
  className?: string;
  onClick?: () => void;
};

export type MonthCalendarProps = {
  year: number;
  month: number;
  days: MonthCalendarDay[];
  weekdayLabels?: string[];
  className?: string;
};

const DEFAULT_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function MonthCalendar({
  year,
  month,
  days,
  weekdayLabels = DEFAULT_WEEKDAYS,
  className,
}: MonthCalendarProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (MonthCalendarDay | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad(month)}-${pad(d)}`;
    cells.push(dayMap.get(date) ?? { date });
  }

  return (
    <div className={cn("rounded-lg border border-border bg-white", className)}>
      <div className="grid grid-cols-7 border-b border-border bg-bg text-center text-[11px] font-semibold text-muted">
        {weekdayLabels.map((w) => (
          <div key={w} className="py-2">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="min-h-[4.5rem] border-b border-r border-border/60 bg-bg/50" />;
          }
          const dayNum = cell.date.slice(8, 10);
          const clickable = Boolean(cell.onClick);
          return (
            <div
              key={cell.date}
              className={cn(
                "min-h-[4.5rem] border-b border-r border-border/60 p-1.5 text-[12px]",
                cell.className,
              )}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={cell.onClick}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded px-1 py-0.5 text-left",
                  clickable && "hover:bg-primary/5",
                  !clickable && "cursor-default",
                )}
              >
                <span className="text-[11px] font-medium text-muted">{dayNum}</span>
                {cell.label ? <span className="text-[11px] leading-tight text-text">{cell.label}</span> : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
