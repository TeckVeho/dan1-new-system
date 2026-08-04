"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataTable, Pagination, type DataTableColumn } from "@/components/layout/DataTable";

export function MasterListShell<T>({
  search,
  onSearchChange,
  searchPlaceholder = "検索",
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  columns,
  rows,
  getRowKey,
  loading,
  emptyMessage,
  toolbar,
  children,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onSearchChange ? (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        ) : (
          <div />
        )}
        {toolbar}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        loading={loading}
        emptyMessage={emptyMessage}
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
