"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Database,
  FileText,
  ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAuditLogs, getOrderWindows, getProcurementImports } from "@/lib/api";
import { cn, formatDateTime, toWeekStart } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  href,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: string;
  unit?: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 transition-colors hover:bg-bg">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 text-xl font-semibold text-text">
          {value}
          {unit ? <span className="ml-0.5 text-[13px] font-normal text-muted">{unit}</span> : null}
        </p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
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

function QuickActionCard({
  href,
  title,
  description,
  illustration,
  tone = "primary",
}: {
  href: string;
  title: string;
  description: string;
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

function FacilityDashboard() {
  const [deadline, setDeadline] = useState<{ deadlineAt: string; remainingSeconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const weekStart = toWeekStart(new Date());
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 6);
    getOrderWindows({
      orderType: "provisional",
      from: weekStart,
      to: to.toISOString().slice(0, 10),
    })
      .then((res) => setDeadline(res))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="ダッシュボード" description="週間注文の状況と次回締切" />

      {error ? (
        <Alert variant="danger" title="API に接続できません" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={CalendarClock}
          label="次回締切"
          value={deadline ? formatDateTime(deadline.deadlineAt) : "—"}
          href="/orders?tab=entry"
        />
        <StatCard icon={ClipboardList} label="今週の注文" value="未確認" href="/orders/weekly" />
        <StatCard icon={FileText} label="最新の献立資料" value="—" href="/documents" />
      </div>

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getProcurementImports({ page: 1, pageSize: 1 }).then((r) => setImportCount(r.total)),
      getAuditLogs({ page: 1, pageSize: 1 }).then((r) => setAuditCount(r.total)),
    ]).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="ダッシュボード" description="受注・発注・在庫の状況を一覧できます" />

      {error ? (
        <Alert variant="danger" title="API に接続できません" className="mb-4">
          {error}
          <p className="mt-1 text-muted">API サーバーを起動してください（既定: http://localhost:4000）。</p>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={AlertTriangle} label="未入力施設アラート" value="—" href="/dashboard/alerts" />
        <StatCard
          icon={CalendarClock}
          label="発注スケジュール"
          value="要確認"
          href="/procurement/schedule"
        />
        <StatCard
          icon={Database}
          label="データ取込履歴"
          value={importCount !== null ? String(importCount) : "—"}
          unit="件"
          href="/procurement/imports"
        />
        <StatCard
          icon={ScrollText}
          label="監査ログ"
          value={auditCount !== null ? String(auditCount) : "—"}
          unit="件"
          href="/audit-logs"
        />
      </div>

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
