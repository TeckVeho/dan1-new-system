"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
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
import { formatDateTime, toWeekStart } from "@/lib/utils";

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
          href="/orders/weekly"
        />
        <StatCard icon={ClipboardList} label="今週の注文" value="未確認" href="/orders/weekly" />
        <StatCard icon={FileText} label="最新の献立資料" value="—" href="/documents" />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-text">よく使う操作</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link
            href="/orders/weekly"
            className="rounded-md border border-border px-3 py-2.5 text-[13px] text-text hover:bg-bg"
          >
            週間注文を入力する
          </Link>
          <Link
            href="/orders/changes"
            className="rounded-md border border-border px-3 py-2.5 text-[13px] text-text hover:bg-bg"
          >
            確定済みの注文を変更する
          </Link>
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
        <StatCard icon={AlertTriangle} label="未入力施設アラート" value="—" href="/orders/changes" />
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

      <section className="mt-6 rounded-lg border border-border bg-white px-4 py-4">
        <h2 className="text-[15px] font-semibold text-text">よく使う操作</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/procurement/schedule"
            className="rounded-md border border-border px-3 py-2.5 text-[13px] text-text hover:bg-bg"
          >
            発注スケジュールを確認する
          </Link>
          <Link
            href="/procurement/imports"
            className="rounded-md border border-border px-3 py-2.5 text-[13px] text-text hover:bg-bg"
          >
            データを取込む
          </Link>
          <Link
            href="/masters/customers"
            className="rounded-md border border-border px-3 py-2.5 text-[13px] text-text hover:bg-bg"
          >
            施設マスタを開く
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return user.type === "internal" ? <InternalDashboard /> : <FacilityDashboard />;
}
