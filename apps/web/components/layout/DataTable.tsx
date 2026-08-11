"use client";

import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows = [],
  getRowKey,
  loading,
  emptyMessage = "データがありません",
  onRowClick,
}: {
  columns: DataTableColumn<T>[];
  rows?: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-border bg-white">
      <table className="w-full min-w-full border-collapse text-left text-[13px]">
        <thead className="sticky top-0 z-10 border-b border-border bg-surface-subtle backdrop-blur">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-3 py-2 text-[12px] font-medium text-muted", col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-muted">
                読み込み中…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border/80 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-primary-light",
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-3 py-2.5 text-text", col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 15, 30, 50, 100, 200];

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-3 py-2 text-[12px] text-muted">
      <div className="flex items-center gap-2">
        <span>表示件数</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-border bg-white px-2 py-1 text-[12px] outline-none focus:border-primary/60"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>全 {total.toLocaleString()} 件</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-border px-2 py-1 transition-colors hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
        >
          前へ
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-border px-2 py-1 transition-colors hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
