"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getAuditLogs,
  getJobs,
  getOrderWindows,
  getProcurementImports,
  getUnenteredFacilities,
  getWeeklyOrders,
} from "@/lib/api";
import type { WeeklyOrdersResponse } from "@/lib/types";
import { addDays, cn, formatDateTime, toWeekStart } from "@/lib/utils";

function countEnteredDays(weekly: WeeklyOrdersResponse) {
  return weekly.dates.filter((date) =>
    weekly.rows.some((row) =>
      row.cells.some((cell) => cell.date === date.date && (cell.quantity ?? 0) > 0),
    ),
  ).length;
}

function QuickActionCard({
  href,
  title,
  description,
  value,
  valueUnit,
  illustration,
  tone = "primary",
}: {
  href: string;
  title: string;
  description: string;
  value?: string;
  valueUnit?: string;
  illustration: ReactNode;
  tone?: "primary" | "accent";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-white p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_10px_28px_-16px_rgb(var(--color-primary)/0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full blur-2xl transition-opacity duration-200",
          tone === "accent" ? "bg-accent/20 group-hover:bg-accent/30" : "bg-primary/15 group-hover:bg-primary/25",
        )}
      />
      <div className="relative flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-text">{title}</p>
          {value ? (
            <p className="mt-1 text-xl font-semibold leading-tight text-text">
              {value}
              {valueUnit ? (
                <span className="ml-0.5 text-[13px] font-normal text-muted">{valueUnit}</span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{description}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
            開く
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
        <div className="h-16 w-[5.25rem] shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-1">
          {illustration}
        </div>
      </div>
    </Link>
  );
}

function IllustrationSchedule() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <rect x="8" y="14" width="52" height="48" rx="8" fill="rgb(var(--color-primary-light))" />
      <rect x="8" y="14" width="52" height="14" rx="8" fill="rgb(var(--color-primary) / 0.22)" />
      <rect x="8" y="22" width="52" height="6" fill="rgb(var(--color-primary) / 0.22)" />
      <circle cx="22" cy="18" r="2.5" fill="rgb(var(--color-primary))" />
      <circle cx="46" cy="18" r="2.5" fill="rgb(var(--color-primary))" />
      <rect x="18" y="34" width="8" height="8" rx="2" fill="rgb(var(--color-accent))" opacity="0.9" />
      <rect x="30" y="34" width="8" height="8" rx="2" fill="rgb(var(--color-primary) / 0.28)" />
      <rect x="42" y="34" width="8" height="8" rx="2" fill="rgb(var(--color-primary) / 0.18)" />
      <rect x="18" y="46" width="8" height="8" rx="2" fill="rgb(var(--color-primary) / 0.18)" />
      <rect x="30" y="46" width="8" height="8" rx="2" fill="rgb(var(--color-primary) / 0.28)" />
      <circle cx="72" cy="42" r="18" fill="rgb(var(--color-accent-light))" />
      <path
        d="M64 42.5l5.5 5.5L81 36"
        fill="none"
        stroke="rgb(var(--color-accent))"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IllustrationImport() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <ellipse cx="48" cy="58" rx="30" ry="6" fill="rgb(var(--color-primary) / 0.08)" />
      <rect x="20" y="28" width="36" height="28" rx="6" fill="rgb(var(--color-primary-light))" />
      <rect x="28" y="20" width="36" height="28" rx="6" fill="rgb(var(--color-primary) / 0.18)" />
      <rect x="36" y="12" width="36" height="28" rx="6" fill="white" stroke="rgb(var(--color-border))" />
      <path d="M44 24h20M44 30h14" stroke="rgb(var(--color-primary) / 0.35)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="70" cy="48" r="16" fill="rgb(var(--color-accent))" />
      <path
        d="M70 40v12M64 48l6 6 6-6"
        fill="none"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IllustrationFacility() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <rect x="14" y="26" width="40" height="36" rx="4" fill="rgb(var(--color-primary-light))" />
      <rect x="22" y="34" width="8" height="8" rx="1.5" fill="rgb(var(--color-primary) / 0.35)" />
      <rect x="38" y="34" width="8" height="8" rx="1.5" fill="rgb(var(--color-primary) / 0.35)" />
      <rect x="22" y="46" width="8" height="8" rx="1.5" fill="rgb(var(--color-primary) / 0.22)" />
      <rect x="38" y="46" width="8" height="16" rx="1.5" fill="rgb(var(--color-primary) / 0.45)" />
      <path d="M10 26h48l-6-10H16l-6 10z" fill="rgb(var(--color-primary) / 0.55)" />
      <rect x="52" y="18" width="28" height="44" rx="4" fill="rgb(var(--color-accent-light))" />
      <rect x="58" y="26" width="7" height="7" rx="1.5" fill="rgb(var(--color-accent) / 0.55)" />
      <rect x="68" y="26" width="7" height="7" rx="1.5" fill="rgb(var(--color-accent) / 0.55)" />
      <rect x="58" y="38" width="7" height="7" rx="1.5" fill="rgb(var(--color-accent) / 0.4)" />
      <rect x="68" y="38" width="7" height="7" rx="1.5" fill="rgb(var(--color-accent) / 0.4)" />
      <rect x="61" y="50" width="10" height="12" rx="1.5" fill="rgb(var(--color-accent))" />
    </svg>
  );
}

function IllustrationOrder() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <rect x="18" y="10" width="44" height="52" rx="8" fill="rgb(var(--color-primary-light))" />
      <rect x="26" y="18" width="28" height="4" rx="2" fill="rgb(var(--color-primary) / 0.35)" />
      <rect x="26" y="28" width="20" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <rect x="26" y="36" width="24" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <rect x="26" y="44" width="16" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <circle cx="68" cy="46" r="18" fill="rgb(var(--color-accent-light))" />
      <path
        d="M68 38v10M62.5 44.5L68 50l5.5-5.5"
        fill="none"
        stroke="rgb(var(--color-accent))"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IllustrationEdit() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <rect x="12" y="16" width="48" height="42" rx="8" fill="rgb(var(--color-primary-light))" />
      <rect x="22" y="26" width="28" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.28)" />
      <rect x="22" y="34" width="22" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.18)" />
      <rect x="22" y="42" width="18" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.18)" />
      <path
        d="M58 48l18-18 8 8-18 18H58v-8z"
        fill="rgb(var(--color-accent))"
      />
      <path d="M72 34l8 8" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function IllustrationAlert() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <rect x="10" y="14" width="46" height="46" rx="8" fill="rgb(var(--color-primary-light))" />
      <rect x="18" y="24" width="26" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.3)" />
      <rect x="18" y="32" width="20" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <rect x="18" y="40" width="24" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <path d="M68 26l16 28H52l16-28z" fill="rgb(var(--color-accent))" />
      <path d="M68 36v8" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="68" cy="49" r="1.9" fill="white" />
    </svg>
  );
}

function IllustrationBell() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <circle cx="46" cy="38" r="24" fill="rgb(var(--color-primary-light))" />
      <path
        d="M46 18a11 11 0 00-11 11v9l-4 6h30l-4-6v-9a11 11 0 00-11-11z"
        fill="rgb(var(--color-primary) / 0.5)"
      />
      <path d="M41 47a5 5 0 0010 0" fill="rgb(var(--color-primary) / 0.7)" />
      <circle cx="70" cy="22" r="9" fill="rgb(var(--color-accent))" />
      <circle cx="70" cy="22" r="3" fill="white" />
    </svg>
  );
}

function IllustrationDocument() {
  return (
    <svg viewBox="0 0 96 72" className="h-full w-full" aria-hidden>
      <rect x="22" y="10" width="40" height="52" rx="6" fill="white" stroke="rgb(var(--color-border))" />
      <rect x="30" y="20" width="24" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.35)" />
      <rect x="30" y="28" width="18" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <rect x="30" y="36" width="22" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <rect x="30" y="44" width="14" height="3.5" rx="1.75" fill="rgb(var(--color-primary) / 0.2)" />
      <circle cx="68" cy="44" r="15" fill="rgb(var(--color-accent-light))" />
      <circle cx="66" cy="42" r="7" fill="none" stroke="rgb(var(--color-accent))" strokeWidth="3" />
      <path d="M71.5 47.5L78 54" stroke="rgb(var(--color-accent))" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FacilityDashboard() {
  const [deadline, setDeadline] = useState<{ deadlineAt: string; remainingSeconds: number } | null>(null);
  const [weeklyOrders, setWeeklyOrders] = useState<WeeklyOrdersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekStart = useMemo(() => toWeekStart(new Date()), []);
  const enteredDays = weeklyOrders ? countEnteredDays(weeklyOrders) : null;

  useEffect(() => {
    Promise.all([
      getOrderWindows({
        orderType: "provisional",
        from: weekStart,
        to: addDays(weekStart, 6),
      }).then((res) => setDeadline(res)),
      getWeeklyOrders({ weekStart }).then((res) => setWeeklyOrders(res)),
    ]).catch((e: Error) => setError(e.message));
  }, [weekStart]);

  return (
    <div>
      <PageHeader title="ダッシュボード" description="週間注文の状況と次回締切" />

      {error ? (
        <Alert variant="danger" title="API に接続できません" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          href="/orders?tab=entry"
          title="次回締切"
          value={deadline ? formatDateTime(deadline.deadlineAt) : "—"}
          description="週間注文の入力画面へ"
          illustration={<IllustrationSchedule />}
        />
        <QuickActionCard
          href="/orders/weekly"
          title="今週の注文"
          value={enteredDays !== null ? `${enteredDays}/${weeklyOrders?.dates.length ?? 0}` : "—"}
          valueUnit="日入力済み"
          description="今週の入力状況を確認"
          illustration={<IllustrationOrder />}
          tone="accent"
        />
        <QuickActionCard
          href="/documents"
          title="最新の献立資料"
          value="—"
          description="献立・配膳資料の閲覧"
          illustration={<IllustrationDocument />}
        />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">情報を確認する</h2>
            <p className="mt-0.5 text-[12px] text-muted">状況やお知らせを確認できます</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/orders/weekly"
            title="今週の注文状況を確認する"
            description="曜日ごとの入力状況を一覧"
            illustration={<IllustrationSchedule />}
          />
          <QuickActionCard
            href="/announcements"
            title="お知らせを確認する"
            description="施設向けのお知らせ一覧"
            illustration={<IllustrationBell />}
            tone="accent"
          />
          <QuickActionCard
            href="/documents"
            title="献立資料を見る"
            description="献立・配膳資料の閲覧"
            illustration={<IllustrationDocument />}
          />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">よく使う操作</h2>
            <p className="mt-0.5 text-[12px] text-muted">よく使う画面へすぐ移動できます</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickActionCard
            href="/orders?tab=entry"
            title="週間注文を入力する"
            description="今週分の注文をまとめて登録"
            illustration={<IllustrationOrder />}
          />
          <QuickActionCard
            href="/orders?tab=content"
            title="確定済みの注文を変更する"
            description="内容の修正・差し替えを行う"
            illustration={<IllustrationEdit />}
            tone="accent"
          />
        </div>
      </section>
    </div>
  );
}

function InternalDashboard() {
  const [importCount, setImportCount] = useState<number | null>(null);
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [runningJobCount, setRunningJobCount] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekStart = useMemo(() => toWeekStart(new Date()), []);

  useEffect(() => {
    Promise.all([
      getProcurementImports({ page: 1, pageSize: 1 }).then((r) => setImportCount(r.total)),
      getAuditLogs({ page: 1, pageSize: 1 }).then((r) => setAuditCount(r.total)),
      getJobs({ status: "running", page: 1, perPage: 1 })
        .then((r) => setRunningJobCount(r.total))
        .catch(() => setRunningJobCount(null)),
      getUnenteredFacilities({
        serviceDateFrom: weekStart,
        serviceDateTo: addDays(weekStart, 6),
      }).then((r) => setAlertCount(r.alerts.length)),
    ]).catch((e: Error) => setError(e.message));
  }, [weekStart]);

  return (
    <div>
      <PageHeader title="ダッシュボード" description="受注・発注・在庫の状況を一覧できます" />

      {error ? (
        <Alert variant="danger" title="API に接続できません" className="mb-4">
          {error}
          <p className="mt-1 text-muted">API サーバーを起動してください（既定: http://localhost:4000）。</p>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          href="/dashboard/alerts"
          title="未入力施設アラート"
          value={alertCount !== null ? String(alertCount) : "—"}
          valueUnit="件"
          description="今週の未入力施設を確認"
          illustration={<IllustrationAlert />}
        />
        <QuickActionCard
          href="/admin/jobs?status=running"
          title="実行中の処理"
          value={runningJobCount !== null ? String(runningJobCount) : "—"}
          valueUnit="件"
          description="バックグラウンド処理の状況"
          illustration={<IllustrationImport />}
          tone="accent"
        />
        <QuickActionCard
          href="/procurement/schedule"
          title="発注スケジュール"
          value="要確認"
          description="締切と発注計画を確認"
          illustration={<IllustrationSchedule />}
        />
        <QuickActionCard
          href="/procurement/imports"
          title="データ取込履歴"
          value={importCount !== null ? String(importCount) : "—"}
          valueUnit="件"
          description="取込結果とエラー内容を確認"
          illustration={<IllustrationDocument />}
        />
        <QuickActionCard
          href="/audit-logs"
          title="監査ログ"
          value={auditCount !== null ? String(auditCount) : "—"}
          valueUnit="件"
          description="操作履歴の検索・確認"
          illustration={<IllustrationEdit />}
        />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">情報を確認する</h2>
            <p className="mt-0.5 text-[12px] text-muted">対応が必要な情報を確認できます</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/dashboard/alerts"
            title="未入力施設を確認する"
            description="食数・合数が未入力の施設を一覧"
            illustration={<IllustrationAlert />}
          />
          <QuickActionCard
            href="/notifications"
            title="通知を確認する"
            description="締切リマインドや処理完了のお知らせ"
            illustration={<IllustrationBell />}
            tone="accent"
          />
          <QuickActionCard
            href="/procurement/imports"
            title="取込履歴を確認する"
            description="取込結果とエラー内容を確認"
            illustration={<IllustrationDocument />}
          />
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">よく使う操作</h2>
            <p className="mt-0.5 text-[12px] text-muted">よく使う画面へすぐ移動できます</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/procurement/schedule"
            title="発注スケジュールを確認する"
            description="締切と発注計画をひと目で確認"
            illustration={<IllustrationSchedule />}
          />
          <QuickActionCard
            href="/procurement/imports"
            title="データを取込む"
            description="外部データを一括で取り込み"
            illustration={<IllustrationImport />}
            tone="accent"
          />
          <QuickActionCard
            href="/masters/customers"
            title="施設マスタを開く"
            description="施設情報の照会・編集"
            illustration={<IllustrationFacility />}
          />
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return user.type === "internal" ? <InternalDashboard /> : <FacilityDashboard />;
}
