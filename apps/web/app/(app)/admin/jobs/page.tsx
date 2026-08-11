"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import { cancelJob, getJobs } from "@/lib/api";
import type { JobItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<JobItem["status"], string> = {
  pending: "待機中",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
  cancelled: "取消",
};

const STATUS_VARIANT: Record<JobItem["status"], "muted" | "primary" | "success" | "danger" | "warning"> = {
  pending: "muted",
  running: "primary",
  completed: "success",
  failed: "danger",
  cancelled: "warning",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  import_procurement_file: "データ取込",
  meal_count_sync: "食数同期",
  "export.spreadsheet": "Excel/CSV出力",
  "report.generate": "帳票出力",
};

function JobsContent() {
  const router = useRouter();
  const { can } = useAuth();
  const [rows, setRows] = useState<JobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJobs({
        page,
        perPage: pageSize,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasRunning = rows.some((r) => r.status === "pending" || r.status === "running");
    if (!hasRunning) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [rows, load]);

  async function handleCancel(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCancellingId(id);
    try {
      await cancelJob(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消に失敗しました");
    } finally {
      setCancellingId(null);
    }
  }

  const columns: DataTableColumn<JobItem>[] = [
    {
      key: "jobType",
      header: "種別",
      render: (row) => JOB_TYPE_LABELS[row.jobType] ?? row.jobType,
    },
    {
      key: "status",
      header: "状態",
      render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABELS[row.status]}</Badge>,
    },
    {
      key: "progress",
      header: "進捗",
      render: (row) => (
        <div className="flex min-w-[100px] items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-bg">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-[12px] text-muted">{row.progress}%</span>
        </div>
      ),
    },
    { key: "createdByName", header: "実行者", render: (row) => row.createdByName ?? "—" },
    { key: "createdAt", header: "開始", render: (row) => formatDateTime(row.createdAt) },
    { key: "completedAt", header: "完了", render: (row) => (row.completedAt ? formatDateTime(row.completedAt) : "—") },
    {
      key: "actions",
      header: "",
      render: (row) =>
        can("admin.job.cancel") && (row.status === "pending" || row.status === "running") ? (
          <Button
            type="button"
            variant="secondary"
            loading={cancellingId === row.id}
            onClick={(e) => handleCancel(row.id, e)}
          >
            取消
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="処理状況" description="データ取込などのバックグラウンド処理の進捗を確認します" />

      {error ? <Alert variant="danger" title="エラー" className="mb-4">{error}</Alert> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[12px] text-muted">状態</label>
          <select
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-[13px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">すべて</option>
            <option value="pending">待機中</option>
            <option value="running">実行中</option>
            <option value="completed">完了</option>
            <option value="failed">失敗</option>
            <option value="cancelled">取消</option>
          </select>
        </div>
        <Input
          label="期間（開始）"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          label="期間（終了）"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={loading}
        onRowClick={(row) => router.push(`/admin/jobs/${row.id}`)}
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <InternalOnly>
      <JobsContent />
    </InternalOnly>
  );
}
