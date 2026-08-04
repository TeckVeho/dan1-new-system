import { cn } from "../lib/utils.js";

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  render?: (row: T, rowIndex: number) => React.ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey?: (row: T, rowIndex: number) => string | number;
  emptyMessage?: string;
  onRowClick?: (row: T, rowIndex: number) => void;
  className?: string;
};

const ALIGN_STYLES: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = "データがありません。",
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="px-4 py-8 text-center text-[13px] text-muted">{emptyMessage}</p>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="sticky top-0 border-b border-border bg-surface/95 text-xs text-muted backdrop-blur">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-2.5 font-medium",
                  ALIGN_STYLES[column.align ?? "left"],
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}
              className={cn(
                "border-b border-border/80 last:border-0",
                onRowClick && "cursor-pointer hover:bg-bg",
              )}
              onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-2.5 text-text",
                    ALIGN_STYLES[column.align ?? "left"],
                    column.className,
                  )}
                >
                  {column.render
                    ? column.render(row, rowIndex)
                    : String((row as Record<string, unknown>)[column.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
