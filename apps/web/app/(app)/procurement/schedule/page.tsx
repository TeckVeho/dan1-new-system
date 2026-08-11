"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/badge";
import { ScheduleGrid, ScheduleLegend } from "@/components/procurement/ScheduleGrid";
import { getProcurementSchedule, patchScheduleCell, exportProcurementSchedule } from "@/lib/api";
import { addDays, formatDateTime } from "@/lib/utils";
import type { ScheduleResponse } from "@/lib/types";

function ScheduleContent() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [supplierId, setSupplierId] = useState("");
  const [deliveryFrom, setDeliveryFrom] = useState(today);
  const [deliveryTo, setDeliveryTo] = useState(addDays(today, 6));
  const [itemQuery, setItemQuery] = useState("");
  const [shortageOnly, setShortageOnly] = useState(false);
  const [mode, setMode] = useState<"detail" | "simple">("detail");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supplierId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getProcurementSchedule({
        supplierId,
        deliveryDateFrom: deliveryFrom,
        deliveryDateTo: deliveryTo,
        itemQuery: itemQuery || undefined,
        shortageOnly: shortageOnly || undefined,
        mode,
        page,
        perPage: 20,
      });
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [supplierId, deliveryFrom, deliveryTo, itemQuery, shortageOnly, mode, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport(format: "xlsx" | "csv") {
    if (!supplierId) {
      setError("対象業者IDを入力してください");
      return;
    }
    setExporting(true);
    setError(null);
    setExportMessage(null);
    try {
      const res = await exportProcurementSchedule({
        supplierId,
        deliveryFrom,
        deliveryTo,
        search: itemQuery || undefined,
        shortageOnly: shortageOnly || undefined,
        format,
      });
      setExportMessage(`Excel出力を開始しました（ジョブID: ${res.jobId}）`);
      router.push(`/admin/jobs/${res.jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "出力の開始に失敗しました");
    } finally {
      setExporting(false);
    }
  }

  async function handleCellEdit(
    scheduleId: string,
    patch: { orderQty?: string; actualStock?: string },
    version: number,
  ) {
    try {
      await patchScheduleCell(scheduleId, { ...patch, version });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  }

  return (
    <div>
      <PageHeader
        title="発注スケジュール"
        description="仕入業者・納品日を指定して発注量・在庫を確認・編集します（業者ロックは廃止）"
        actions={
          <>
            <Button variant="secondary" onClick={() => window.print()} disabled={!data}>
              <Printer className="h-3.5 w-3.5" />
              印刷
            </Button>
            <Button variant="secondary" loading={exporting} onClick={() => handleExport("xlsx")} disabled={!supplierId}>
              <Download className="h-3.5 w-3.5" />
              Excel出力
            </Button>
          </>
        }
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {exportMessage ? (
        <Alert variant="success" className="mb-4">
          {exportMessage}
        </Alert>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-white px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="対象業者ID"
          placeholder="例: 7"
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value);
            setPage(1);
          }}
        />
        <Input
          label="納品日（開始）"
          type="date"
          value={deliveryFrom}
          onChange={(e) => setDeliveryFrom(e.target.value)}
        />
        <Input
          label="納品日（終了）"
          type="date"
          value={deliveryTo}
          onChange={(e) => setDeliveryTo(e.target.value)}
        />
        <div className="relative">
          <label className="mb-1.5 block text-[13px] font-medium text-muted">商品名で絞込</label>
          <Search className="pointer-events-none absolute left-2.5 top-[calc(50%+10px)] h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={itemQuery}
            onChange={(e) => {
              setItemQuery(e.target.value);
              setPage(1);
            }}
            placeholder="商品名の部分一致"
            className="w-full rounded-md border border-border bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-[13px] text-text">
            <input
              type="checkbox"
              checked={shortageOnly}
              onChange={(e) => {
                setShortageOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-border text-primary"
            />
            不足のみ表示
          </label>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ScheduleLegend />
        <div className="flex gap-1.5">
          <FilterChip active={mode === "detail"} onClick={() => setMode("detail")} label="詳細モード" />
          <FilterChip active={mode === "simple"} onClick={() => setMode("simple")} label="簡易モード" />
        </div>
      </div>

      {!supplierId ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          対象業者IDを入力してください
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
          読み込み中…
        </div>
      ) : data ? (
        <>
          <ScheduleGrid data={data} mode={mode} onCellEdit={handleCellEdit} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
            <span>最終計算: {formatDateTime(data.calculatedAt)}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                前へ
              </Button>
              <span>
                {data.meta.page} / {data.meta.totalPages}（全 {data.meta.totalCount} 商品）
              </span>
              <Button
                variant="secondary"
                size="md"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                次へ
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function ProcurementSchedulePage() {
  return (
    <InternalOnly>
      <ScheduleContent />
    </InternalOnly>
  );
}
