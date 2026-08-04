"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, getOrders, patchOrder } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "@/lib/types";

type EditState = { changedQuantity: number; reason: string };

export default function OrderChangesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({ page, perPage: pageSize });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

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
    setSavingId(row.id);
    setError(null);
    try {
      await patchOrder(row.id, { quantity: edit.changedQuantity, reason: edit.reason, version: row.version });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingId(null);
    }
  }

  const columns: DataTableColumn<OrderListItem>[] = [
    { key: "unitName", header: "ユニット" },
    { key: "serviceDate", header: "喫食日" },
    { key: "mealTypeName", header: "食事区分" },
    { key: "menuKindName", header: "献立種類" },
    {
      key: "currentQuantity",
      header: "現在の食数",
      className: "text-right tabular-nums",
      render: (row) => row.currentQuantity,
    },
    {
      key: "changedQuantity",
      header: "変更後の食数",
      render: (row) => (
        <input
          type="number"
          min={0}
          value={edits[row.id]?.changedQuantity ?? row.currentQuantity}
          onChange={(e) => setEdit(row.id, { changedQuantity: Number(e.target.value) }, row)}
          className="h-7 w-16 rounded-md border border-border bg-white px-2 text-right text-[13px] tabular-nums outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
        />
      ),
    },
    {
      key: "diff",
      header: "差分",
      render: (row) => {
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
      render: (row) => (
        <input
          type="text"
          placeholder="任意"
          value={edits[row.id]?.reason ?? row.reason ?? ""}
          onChange={(e) => setEdit(row.id, { reason: e.target.value }, row)}
          className="h-7 w-36 rounded-md border border-border bg-white px-2 text-[13px] outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        edits[row.id] ? (
          <Button size="md" onClick={() => handleSaveRow(row)} loading={savingId === row.id} className="h-7">
            <Save className="h-3 w-3" />
            保存
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="注文変更"
        description={
          user.type === "internal"
            ? "確定済みの注文を代理で変更できます"
            : "8月14日 〜 8月19日 喫食分が変更可能です"
        }
      />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={loading}
        emptyMessage="変更可能な注文がありません"
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
        pageSizeOptions={[10, 15, 30, 50, 100, 200]}
      />
    </div>
  );
}
