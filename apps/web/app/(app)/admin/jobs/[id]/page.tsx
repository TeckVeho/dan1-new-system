"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { cancelJob, downloadFile, getJob } from "@/lib/api";
import type { JobDetail } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<JobDetail["status"], string> = {
  pending: "待機中",
  running: "実行中",
  completed: "完了",
  failed: "失敗",
  cancelled: "取消",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  import_procurement_file: "データ取込",
  meal_count_sync: "食数同期",
  "export.spreadsheet": "Excel/CSV出力",
  "report.generate": "帳票出力",
};

function JobDetailContent() {
  const params = useParams();
  const id = String(params.id);
  const { can } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJob(await getJob(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!job || (job.status !== "pending" && job.status !== "running")) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [job, load]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelJob(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消に失敗しました");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <div className="text-[13px] text-muted">読み込み中…</div>;
  }

  if (!job) {
    return <Alert variant="danger">ジョブが見つかりません</Alert>;
  }

  return (
    <div>
      <PageHeader
        title={JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
        description={`ジョブ ID: ${job.id}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/jobs">
              <Button variant="secondary" type="button">一覧に戻る</Button>
            </Link>
            {can("admin.job.cancel") && (job.status === "pending" || job.status === "running") ? (
              <Button type="button" loading={cancelling} onClick={handleCancel}>
                取消
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[12px] text-muted">状態</p>
          <p className="mt-1 text-[14px] font-medium">{STATUS_LABELS[job.status]}</p>
        </div>
        <div>
          <p className="text-[12px] text-muted">進捗</p>
          <p className="mt-1 text-[14px] font-medium">{job.progress}%</p>
        </div>
        <div>
          <p className="text-[12px] text-muted">開始</p>
          <p className="mt-1 text-[14px]">{formatDateTime(job.createdAt)}</p>
        </div>
        <div>
          <p className="text-[12px] text-muted">完了</p>
          <p className="mt-1 text-[14px]">{job.completedAt ? formatDateTime(job.completedAt) : "—"}</p>
        </div>
      </div>

      {job.error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {job.error}
        </Alert>
      ) : null}

      {job.params ? (
        <section className="mb-4 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-2 text-[14px] font-semibold">パラメータ</h2>
          <pre className="overflow-auto rounded-md bg-bg p-3 text-[12px] text-text">
            {JSON.stringify(job.params, null, 2)}
          </pre>
        </section>
      ) : null}

      {job.result ? (
        <section className="mb-4 rounded-lg border border-border bg-white p-4">
          <h2 className="mb-2 text-[14px] font-semibold">結果</h2>
          {typeof job.result.fileId === "string" ? (
            <div className="mb-3">
              <Button type="button" variant="secondary" onClick={() => downloadFile(job.result!.fileId as string)}>
                ファイルをダウンロード
              </Button>
            </div>
          ) : null}
          <pre className="overflow-auto rounded-md bg-bg p-3 text-[12px] text-text">
            {JSON.stringify(job.result, null, 2)}
          </pre>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-3 text-[14px] font-semibold">ログ</h2>
        {job.logs.length === 0 ? (
          <p className="text-[13px] text-muted">ログはありません</p>
        ) : (
          <ul className="space-y-2">
            {job.logs.map((log) => (
              <li key={log.id} className="flex items-start gap-2 text-[13px]">
                <Badge variant={log.level === "error" ? "danger" : "muted"}>{log.level}</Badge>
                <span className="text-muted">{formatDateTime(log.createdAt)}</span>
                <span className="flex-1 text-text">{log.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminJobDetailPage() {
  return (
    <InternalOnly>
      <JobDetailContent />
    </InternalOnly>
  );
}
