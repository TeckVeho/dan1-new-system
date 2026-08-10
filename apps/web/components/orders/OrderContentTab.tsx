"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Download, Printer } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterChip } from "@/components/ui/badge";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ApiError,
  exportOrdersCsv,
  getOrderChanges,
  getOrderSummary,
  getOrderWindowsFull,
  getOrders,
  patchOrder,
} from "@/lib/api";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import type { OrderChangeLogItem, OrderListItem } from "@/lib/types";

type ViewMode = "detail" | "unit" | "day" | "editable";

type EditState = { changedQuantity: number; reason: string };

type Props = {
  customerId: string;
  monthAnchor: string;
  focusOrderId?: string;
  onChangeMessage?: (message: string | null) => void;
};

function monthRange(base: string) {
  const d = new Date(base);
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function OrderContentTab({ customerId, monthAnchor, focusOrderId, onChangeMessage }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>("detail");
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryRows, setSummaryRows] = useState<Array<{ label: string; total: number }>>([]);
  const [changeWindow, setChangeWindow] = useState<{ from: string; to: string } | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<OrderListItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [changeLogs, setChangeLogs] = useState<OrderChangeLogItem[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);

  const { from, to } = monthRange(monthAnchor);

  const load = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const windowRes = await getOrderWindowsFull({
        orderType: "change",
        from: today,
        to,
        customerId,
      });
      const cw = windowRes.changeWindow;
      onChangeMessage?.(cw?.message ?? null);
      const changeFrom = cw?.serviceDateFrom ?? from;
      const changeTo = cw?.serviceDateTo ?? to;
      setChangeWindow({ from: changeFrom, to: changeTo });

      if (view === "detail" || view === "editable") {
        const ordersRes = await getOrders({
          customerId,
          serviceDateFrom: view === "editable" ? changeFrom : from,
          serviceDateTo: view === "editable" ? changeTo : to,
          status: view === "editable" ? "confirmed" : undefined,
          page,
          perPage: pageSize,
        });
        setRows(ordersRes.items);
        setTotal(ordersRes.total);
      } else {
        const groupBy = view === "unit" ? "unit" : "day";
        const summary = await getOrderSummary({
          customerId,
          serviceDateFrom: from,
          serviceDateTo: to,
          groupBy,
        });
        setSummaryRows(
          summary.rows.map((r) => {
            if ("unitName" in r) return { label: r.unitName, total: r.total };
            if ("date" in r) return { label: r.date, total: r.total };
            return { label: r.month, total: r.total };
          }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId, from, to, page, pageSize, view, onChangeMessage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (focusOrderId && rows.some((r) => r.id === focusOrderId)) {
      setExpandedId(focusOrderId);
      setView("editable");
    }
  }, [focusOrderId, rows]);

  function isEditableRow(row: OrderListItem): boolean {
    if (!changeWindow || row.status !== "confirmed") return false;
    return row.serviceDate >= changeWindow.from && row.serviceDate <= changeWindow.to;
  }

  function setEdit(id: string, patch: Partial<EditState>, base: OrderListItem) {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        changedQuantity: prev[id]?.changedQuantity ?? base.currentQuantity,
        reason: prev[id]?.reason ?? "",
        ...patch,
      },
    }));
  }

  async function handleSaveRow(row: OrderListItem) {
    const edit = edits[row.id];
    if (!edit) return;
    setSaving(true);
    setError(null);
    try {
      await patchOrder(row.id, { quantity: edit.changedQuantity, reason: edit.reason, version: row.version });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setConfirmOpen(false);
      setPendingSave(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleExpand(row: OrderListItem) {
    if (expandedId === row.id) {
      setExpandedId(null);
      setChangeLogs([]);
      return;
    }
    setExpandedId(row.id);
    setChangesLoading(true);
    try {
      setChangeLogs(await getOrderChanges(row.id));
    } catch {
      setChangeLogs([]);
    } finally {
      setChangesLoading(false);
    }
  }

  async function handleExport() {
    try {
      await exportOrdersCsv({ customerId, serviceDateFrom: from, serviceDateTo: to });
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV出力に失敗しました");
    }
  }

  const columns: DataTableColumn<OrderListItem>[] = [
    { key: "unitName", header: "ユニット" },
    { key: "serviceDate", header: "喫食日" },
    { key: "mealTypeName", header: "食事区分" },
    { key: "menuKindName", header: "献立種類" },
    {
      key: "currentQuantity",
      header: "食数",
      className: "text-right tabular-nums",
      render: (row) => formatNumber(row.currentQuantity),
    },
    {
      key: "changedQuantity",
      header: "変更後",
      render: (row) =>
        isEditableRow(row) ? (
          <input
            type="number"
            min={0}
            value={edits[row.id]?.changedQuantity ?? row.currentQuantity}
            onChange={(e) => setEdit(row.id, { changedQuantity: Number(e.target.value) }, row)}
            className="h-7 w-16 rounded-md border border-border bg-white px-2 text-right text-[13px] tabular-nums outline-none focus:border-primary/60"
          />
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "diff",
      header: "差分",
      render: (row) => {
        if (!isEditableRow(row)) return <span className="text-muted">—</span>;
        const changed = edits[row.id]?.changedQuantity ?? row.currentQuantity;
        const diff = changed - row.currentQuantity;
        if (diff === 0) return <span className="text-muted">±0</span>;
        return (
          <span className={cn("font-medium tabular-nums", diff > 0 ? "text-success" : "text-danger")}>
            {diff > 0 ? `+${diff}` : diff}
          </span>
        );
      },
    },
    {
      key: "reason",
      header: "変更理由",
      render: (row) =>
        isEditableRow(row) ? (
          <input
            type="text"
            placeholder="任意"
            value={edits[row.id]?.reason ?? row.reason ?? ""}
            onChange={(e) => setEdit(row.id, { reason: e.target.value }, row)}
            className="h-7 w-36 rounded-md border border-border bg-white px-2 text-[13px] outline-none focus:border-primary/60"
          />
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "history",
      header: "履歴",
      render: (row) => (
        <Button variant="ghost" size="md" className="h-7" onClick={() => handleExpand(row)}>
          {expandedId === row.id ? "閉じる" : "表示"}
        </Button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => {
        const edit = edits[row.id];
        const changed = edit && edit.changedQuantity !== row.currentQuantity;
        return changed && isEditableRow(row) ? (
          <Button size="md" onClick={() => { setPendingSave(row); setConfirmOpen(true); }} loading={saving && pendingSave?.id === row.id} className="h-7">
            <Save className="h-3 w-3" />
            保存
          </Button>
        ) : null;
      },
    },
  ];

  if (!customerId) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-10 text-center text-[13px] text-muted">
        施設を選択してください。
      </div>
    );
  }

  return (
    <div>
      {user.type === "internal" ? (
        <Alert variant="info" className="mb-4">
          社内ユーザーによる保存は代理入力として記録されます。
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={view === "detail"} onClick={() => setView("detail")} label="明細一覧" />
          <FilterChip active={view === "editable"} onClick={() => setView("editable")} label="変更できる行のみ" />
          <FilterChip active={view === "unit"} onClick={() => setView("unit")} label="ユニット別集計" />
          <FilterChip active={view === "day"} onClick={() => setView("day")} label="日別集計" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            印刷
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen && pendingSave !== null}
        onClose={() => { setConfirmOpen(false); setPendingSave(null); }}
        onConfirm={() => pendingSave && handleSaveRow(pendingSave)}
        title="変更内容の確認"
        confirmLabel="保存する"
        loading={saving}
        message={
          pendingSave && edits[pendingSave.id] ? (
            <div className="space-y-2 text-[13px]">
              <p>
                {pendingSave.unitName} / {pendingSave.serviceDate} / {pendingSave.mealTypeName} / {pendingSave.menuKindName}
              </p>
              <p>
                食数: <strong>{pendingSave.currentQuantity}</strong> → <strong>{edits[pendingSave.id].changedQuantity}</strong>
              </p>
            </div>
          ) : null
        }
      />

      {view === "detail" || view === "editable" ? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            loading={loading}
            emptyMessage="対象期間の注文がありません"
          />
          {expandedId ? (
            <div className="mt-3 rounded-lg border border-border bg-white px-4 py-3">
              <p className="mb-2 text-[13px] font-medium text-text">変更履歴</p>
              {changesLoading ? (
                <p className="text-[12px] text-muted">読み込み中…</p>
              ) : changeLogs.length === 0 ? (
                <p className="text-[12px] text-muted">変更履歴はありません</p>
              ) : (
                <ul className="space-y-1 text-[12px] text-muted">
                  {changeLogs.map((log) => (
                    <li key={log.id}>
                      {formatDateTime(log.changedAt)}: {log.beforeValue ?? "—"} → {log.afterValue ?? "—"}
                      {log.reason ? `（${log.reason}）` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            pageSizeOptions={[10, 30, 60, 100]}
          />
        </>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-full border-collapse text-left text-[13px]">
            <thead className="border-b border-border bg-surface/95">
              <tr className="text-[12px] text-muted">
                <th className="px-3 py-2 font-medium">{view === "unit" ? "ユニット" : "喫食日"}</th>
                <th className="px-3 py-2 text-right font-medium">合計食数</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} className="px-3 py-8 text-center text-muted">読み込み中…</td></tr>
              ) : summaryRows.length === 0 ? (
                <tr><td colSpan={2} className="px-3 py-8 text-center text-muted">データがありません</td></tr>
              ) : (
                summaryRows.map((row) => (
                  <tr key={row.label} className="border-b border-border/80 hover:bg-bg">
                    <td className="px-3 py-2.5">{row.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(row.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
