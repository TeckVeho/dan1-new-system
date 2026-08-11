"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionNavTabs } from "@/components/layout/SectionNavTabs";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { generateReport, getMealCountConfirmation } from "@/lib/api";
import { addDays, toWeekStart } from "@/lib/utils";
import type { MealCountConfirmRow } from "@/lib/types";

function MealCountsContent() {
  const [weekStart, setWeekStart] = useState(() => toWeekStart(new Date()));
  const [rows, setRows] = useState<MealCountConfirmRow[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMealCountConfirmation({ serviceDateFrom: weekStart, serviceDateTo: weekEnd });
      setRows(res.rows);
      setTotalQuantity(res.totalQuantity);
      setCustomerCount(res.customerCount);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await generateReport("meal_count_confirm", {
        serviceDateFrom: weekStart,
        serviceDateTo: weekEnd,
        format: "xlsx",
      });
      setMessage(`帳票出力を開始しました（ジョブID: ${res.jobId}）`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "帳票出力に失敗しました");
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn<MealCountConfirmRow>[] = [
    { key: "serviceDate", header: "喫食日" },
    { key: "customerCode", header: "施設番号" },
    { key: "customerName", header: "施設名" },
    { key: "unitName", header: "ユニット" },
    { key: "mealType", header: "食事区分" },
    { key: "menuKind", header: "献立種類" },
    { key: "orderType", header: "注文区分" },
    { key: "quantity", header: "食数" },
    { key: "status", header: "ステータス" },
  ];

  return (
    <div>
      <PageHeader
        title="注文食数の確認"
        description="製造へ渡す食数を確認します"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? "出力中…" : "Excel出力"}
            </Button>
            <Link href="/admin/jobs" className="text-[12px] text-primary hover:underline self-center">
              ジョブ状況
            </Link>
          </div>
        }
      />
      <SectionNavTabs groupId="orders" />

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}
      {message ? <Alert variant="success" className="mb-4">{message}</Alert> : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="w-40" />
        <span className="text-[13px] text-muted">〜 {weekEnd}</span>
        <span className="text-[13px] font-medium text-text">
          施設 {customerCount}件 / 合計 {totalQuantity}食
        </span>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">読み込み中…</div>
      ) : (
        <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} emptyMessage="対象期間の注文食数がありません" />
      )}
    </div>
  );
}

export default function MealCountsPage() {
  return (
    <InternalOnly>
      <MealCountsContent />
    </InternalOnly>
  );
}
