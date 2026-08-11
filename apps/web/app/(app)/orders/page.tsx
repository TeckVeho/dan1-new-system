"use client";

import { Suspense, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionNavTabs } from "@/components/layout/SectionNavTabs";
import { InternalOnly } from "@/components/auth/InternalOnly";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";
import { CustomerSearchSelect } from "@/components/orders/CustomerSearchSelect";
import { OrderContextBar, useOrderWorkspaceParams } from "@/components/orders/OrderContextBar";
import { OrderEntryTab } from "@/components/orders/OrderEntryTab";
import { OrderContentTab } from "@/components/orders/OrderContentTab";
import { OrderCalendarTab } from "@/components/orders/OrderCalendarTab";
import { OrderWorkspaceLink } from "@/components/orders/OrderContextBar";
import { useAuth } from "@/components/auth/AuthProvider";
import { getOrders } from "@/lib/api";
import { addDays, toWeekStart } from "@/lib/utils";
import type { OrderListItem } from "@/lib/types";
import { useCallback, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  provisional: "仮注文",
  confirmed: "確定",
  cancelled: "取消",
};

function OrdersListPanel() {
  const [weekStart, setWeekStart] = useState(() => toWeekStart(new Date()));
  const [customerId, setCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "draft" | "provisional" | "confirmed">("");
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 6);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({
        customerId: customerId || undefined,
        search: search || undefined,
        serviceDateFrom: weekStart,
        serviceDateTo: weekEnd,
        status: status || undefined,
        page,
        perPage: pageSize,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, customerId, search, status, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: DataTableColumn<OrderListItem>[] = [
    { key: "customerCode", header: "施設番号", render: (row) => row.customerCode ?? "—" },
    {
      key: "customerName",
      header: "施設名",
      render: (row) =>
        row.customerId ? (
          <OrderWorkspaceLink customerId={row.customerId} className="text-primary hover:underline">
            {row.customerName ?? "—"}
          </OrderWorkspaceLink>
        ) : (
          row.customerName ?? "—"
        ),
    },
    { key: "serviceDate", header: "喫食日" },
    { key: "unitName", header: "ユニット" },
    { key: "mealTypeName", header: "食事区分" },
    { key: "menuKindName", header: "献立種類" },
    {
      key: "currentQuantity",
      header: "食数",
      className: "text-right tabular-nums",
      render: (row) => row.currentQuantity,
    },
    {
      key: "status",
      header: "ステータス",
      render: (row) => (
        <Badge variant={row.status === "confirmed" ? "success" : row.status === "provisional" ? "warning" : "muted"}>
          {STATUS_LABELS[row.status ?? ""] ?? row.status ?? "—"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.customerId ? (
          <Link
            href={`/orders?customer=${row.customerId}&tab=content&focus=${row.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[12px] text-muted hover:bg-bg hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </Link>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="注文"
        description="全施設の注文を横断して確認できます。施設で絞り込んだあと、必要ならワークスペースで入力・変更ができます。"
      />
      <SectionNavTabs groupId="orders" />

      {error ? (
        <Alert variant="danger" title="エラー" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-muted">週の開始日</label>
          <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="w-40" />
        </div>
        <span className="pb-1 text-[13px] text-muted">〜 {weekEnd}</span>
        <div className="w-56">
          <label className="mb-1 block text-[11px] text-muted">施設で絞り込み</label>
          <div className="flex items-center gap-1">
            <CustomerSearchSelect
              value={customerId}
              onChange={(id) => {
                setCustomerId(id);
                setPage(1);
              }}
              className="min-w-0 flex-1"
            />
            {customerId ? (
              <button
                type="button"
                onClick={() => {
                  setCustomerId("");
                  setPage(1);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:bg-bg hover:text-text"
                title="施設の絞り込みを解除"
                aria-label="施設の絞り込みを解除"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        {customerId ? (
          <div className="pb-0.5">
            <span className="mb-1 block text-[11px] text-transparent select-none">操作</span>
            <Link
              href={`/orders?customer=${customerId}&tab=entry`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-white px-3 text-[13px] font-medium text-text hover:bg-bg"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              ワークスペースを開く
            </Link>
          </div>
        ) : null}
        <div className="w-40">
          <label className="mb-1 block text-[11px] text-muted">施設名・番号</label>
          <Input placeholder="絞り込み" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} loading={loading} emptyMessage="該当する注文がありません" />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        pageSizeOptions={[20, 50, 100, 200]}
      />
    </div>
  );
}

function OrdersWorkspace() {
  const { user } = useAuth();
  const { customer, tab, weekStart, monthAnchor, span, focus, setParams, backToList } = useOrderWorkspaceParams();
  const [dirtyCount, setDirtyCount] = useState(0);
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [changeMessage, setChangeMessage] = useState<string | null>(null);

  const effectiveCustomer =
    user.type === "facility" ? user.customerId ?? "" : customer;

  if (user.type === "internal" && !effectiveCustomer) {
    return (
      <InternalOnly>
        <OrdersListPanel />
      </InternalOnly>
    );
  }

  return (
    <div>
      <PageHeader
        title="注文"
        description={
          user.type === "internal"
            ? "週間の入力・変更・履歴・締切を1か所で操作できます"
            : "週間注文の入力と確認"
        }
      />
      <SectionNavTabs groupId="orders" />

      <OrderContextBar
        customerId={effectiveCustomer}
        weekStart={weekStart}
        monthAnchor={monthAnchor}
        tab={tab}
        span={span}
        deadlineAt={deadlineAt}
        remainingSeconds={remainingSeconds ?? undefined}
        changeMessage={changeMessage}
        dirtyCount={dirtyCount}
        onWeekStartChange={(from) => setParams({ from, tab: "entry" })}
        onMonthAnchorChange={(month) => setParams({ month })}
        onCustomerChange={(id) => {
          if (!id) backToList();
          else setParams({ customer: id, focus: null });
        }}
        onBackToList={backToList}
        onTabChange={(t) => setParams({ tab: t })}
        onSpanChange={(s) => setParams({ span: s, tab: "entry" })}
      />

      {tab === "entry" ? (
        <OrderEntryTab
          customerId={effectiveCustomer}
          weekStart={weekStart}
          span={span}
          onDirtyCountChange={setDirtyCount}
          onDeadlineChange={(at, sec) => {
            setDeadlineAt(at);
            setRemainingSeconds(sec);
          }}
        />
      ) : tab === "content" ? (
        <OrderContentTab
          customerId={effectiveCustomer}
          monthAnchor={monthAnchor}
          focusOrderId={focus || undefined}
          onChangeMessage={setChangeMessage}
        />
      ) : (
        <OrderCalendarTab
          customerId={effectiveCustomer}
          monthAnchor={monthAnchor}
          onNavigateWeek={(from) => setParams({ tab: "entry", from, span: "week" })}
        />
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-4 text-[13px] text-muted">読み込み中…</div>}>
      <OrdersWorkspace />
    </Suspense>
  );
}
