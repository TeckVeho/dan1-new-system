"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CustomerSearchSelect } from "@/components/orders/CustomerSearchSelect";
import { useAuth } from "@/components/auth/AuthProvider";
import { addDays, formatDateTime, formatRemaining, toWeekStart } from "@/lib/utils";
import type { OrderWorkspaceTab } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: OrderWorkspaceTab; label: string }[] = [
  { id: "entry", label: "入力" },
  { id: "content", label: "注文内容" },
  { id: "calendar", label: "カレンダー" },
];

type Props = {
  customerId: string;
  weekStart: string;
  monthAnchor: string;
  tab: OrderWorkspaceTab;
  span: "week" | "month" | "new_year";
  deadlineAt?: string | null;
  remainingSeconds?: number;
  changeMessage?: string | null;
  dirtyCount?: number;
  onWeekStartChange: (value: string) => void;
  onMonthAnchorChange: (value: string) => void;
  onCustomerChange: (id: string) => void;
  onTabChange: (tab: OrderWorkspaceTab) => void;
  onSpanChange: (span: "week" | "month" | "new_year") => void;
  onBackToList?: () => void;
};

export function OrderContextBar({
  customerId,
  weekStart,
  monthAnchor,
  tab,
  span,
  deadlineAt,
  remainingSeconds,
  changeMessage,
  dirtyCount,
  onWeekStartChange,
  onMonthAnchorChange,
  onCustomerChange,
  onTabChange,
  onSpanChange,
  onBackToList,
}: Props) {
  const { user } = useAuth();
  const weekEnd = addDays(weekStart, 6);
  const monthDate = new Date(monthAnchor);

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-border bg-white p-4">
      {user.type === "internal" && customerId && onBackToList ? (
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          注文一覧に戻る
        </button>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                tab === t.id ? "bg-primary text-white" : "text-muted hover:bg-bg hover:text-text",
              )}
            >
              {t.label}
              {t.id === "entry" && dirtyCount ? (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[11px]">{dirtyCount}</span>
              ) : null}
            </button>
          ))}
        </div>
        {user.type === "internal" ? (
          <div className="flex w-64 items-center gap-1">
            <CustomerSearchSelect
              value={customerId}
              onChange={onCustomerChange}
              className="min-w-0 flex-1"
            />
            {customerId ? (
              <button
                type="button"
                onClick={() => onCustomerChange("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:bg-bg hover:text-text"
                title="施設の選択を解除"
                aria-label="施設の選択を解除"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] font-medium text-text">{user.customerName}</p>
        )}
      </div>

      {tab === "entry" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={() => onWeekStartChange(addDays(weekStart, -7))}>
            <ChevronLeft className="h-3.5 w-3.5" />
            前週
          </Button>
          <span className="px-2 text-[13px] font-medium text-text">
            {weekStart} 〜 {weekEnd}
          </span>
          <Button variant="secondary" size="md" onClick={() => onWeekStartChange(addDays(weekStart, 7))}>
            翌週
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="md" onClick={() => onWeekStartChange(toWeekStart(new Date()))}>
            今週
          </Button>
          <Button
            variant={span === "new_year" ? "primary" : "secondary"}
            size="md"
            onClick={() => onSpanChange(span === "new_year" ? "week" : "new_year")}
          >
            元旦
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              const d = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
              onMonthAnchorChange(d.toISOString().slice(0, 10));
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            前月
          </Button>
          <span className="px-2 text-[13px] font-medium text-text">
            {monthDate.getFullYear()}年{monthDate.getMonth() + 1}月
          </span>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              const d = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
              onMonthAnchorChange(d.toISOString().slice(0, 10));
            }}
          >
            翌月
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {deadlineAt ? (
        <Alert variant={(remainingSeconds ?? 0) < 86400 ? "warning" : "info"}>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            次回締切: {formatDateTime(deadlineAt)}
            {remainingSeconds !== undefined ? `（${formatRemaining(remainingSeconds)}）` : null}
          </span>
        </Alert>
      ) : null}

      {changeMessage && tab === "content" ? <Alert variant="info">{changeMessage}</Alert> : null}
    </div>
  );
}

export function useOrderWorkspaceParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const customer = searchParams.get("customer") ?? (user.type === "facility" ? user.customerId ?? "" : "");
  const tab = (searchParams.get("tab") as OrderWorkspaceTab) ?? "entry";
  const weekStart = searchParams.get("from") ?? toWeekStart(new Date());
  const monthAnchor = searchParams.get("month") ?? new Date().toISOString().slice(0, 10);
  const span = (searchParams.get("span") as "week" | "month" | "new_year") ?? "week";
  const focus = searchParams.get("focus") ?? "";

  function setParams(patch: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    router.replace(qs ? `/orders?${qs}` : "/orders");
  }

  function backToList() {
    router.replace("/orders");
  }

  return { customer, tab, weekStart, monthAnchor, span, focus, setParams, backToList };
}

export function OrderWorkspaceLink({
  customerId,
  tab = "entry",
  className,
  children,
}: {
  customerId: string;
  tab?: OrderWorkspaceTab;
  className?: string;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams({ customer: customerId, tab });
  return (
    <Link href={`/orders?${params}`} className={className}>
      {children}
    </Link>
  );
}
