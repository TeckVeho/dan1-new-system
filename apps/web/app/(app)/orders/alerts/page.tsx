"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/layout/DataTable";
import { getUnenteredFacilities } from "@/lib/api";
import { addDays, toWeekStart } from "@/lib/utils";
import type { UnenteredFacilityAlert } from "@/lib/types";

const MISSING_LABELS: Record<string, string> = {
  meal_count: "食数",
  rice: "合数",
};

export default function OrderAlertsPage() {
  const [weekStart, setWeekStart] = useState(() => toWeekStart(new Date()));
  const [alerts, setAlerts] = useState<UnenteredFacilityAlert[]>([]);
  const [excluded, setExcluded] = useState({
    contractEnded: 0,
    orderSuspended: 0,
    longHoliday: 0,
    weekdayNotApplicable: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUnenteredFacilities({ serviceDateFrom: weekStart, serviceDateTo: weekEnd });
      setAlerts(result.alerts);
      setExcluded(result.excluded);
    } catch (e) {
      setAlerts([]);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: DataTableColumn<UnenteredFacilityAlert>[] = [
    { key: "serviceDate", header: "喫食日", render: (row) => row.serviceDate },
    { key: "customerCode", header: "施設番号", render: (row) => row.customerCode },
    { key: "customerName", header: "施設名", render: (row) => row.customerName },
    {
      key: "missingTypes",
      header: "未入力",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.missingTypes.map((type) => (
            <Badge key={type} variant="warning">
              {MISSING_LABELS[type] ?? type}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "previous",
      header: "前回注文",
      render: (row) =>
        row.previousOrderSummary
          ? `${row.previousOrderSummary.lastServiceDate}（${row.previousOrderSummary.totalQuantity}食）`
          : "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="未入力施設アラート"
        description="注文義務のある施設のうち、食数・合数が未入力の施設を表示します"
      />

      <Alert variant="info" className="mb-4">
        契約終了・注文停止中の施設は除外されます（今週の除外件数: 契約終了 {excluded.contractEnded}件 /
        注文停止 {excluded.orderSuspended}件）
      </Alert>

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="w-40" />
        <span className="text-[13px] text-muted">〜 {weekEnd}</span>
        <span className="text-[13px] font-medium text-text">未入力 {alerts.length}件</span>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={alerts}
          getRowKey={(row) => `${row.customerId}-${row.serviceDate}`}
          emptyMessage="未入力の施設はありません"
        />
      )}
    </div>
  );
}
