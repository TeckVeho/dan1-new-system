import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary",
        variant === "success" && "bg-success/10 text-success",
        variant === "warning" && "bg-warning/10 text-warning",
        variant === "danger" && "bg-danger/10 text-danger",
        variant === "muted" && "bg-bg text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
        active
          ? "border-primary/40 bg-primary/10 font-medium text-primary"
          : "border-border bg-white text-muted hover:border-primary/30 hover:text-text",
      )}
    >
      {label}
    </button>
  );
}
