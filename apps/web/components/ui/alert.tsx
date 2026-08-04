import { AlertCircle, CheckCircle2, Clock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "danger" | "warning" | "success";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon =
    variant === "danger"
      ? AlertCircle
      : variant === "warning"
        ? TriangleAlert
        : variant === "success"
          ? CheckCircle2
          : Clock;

  return (
    <div
      role={variant === "danger" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3 text-[13px]",
        variant === "danger" && "border-danger/30 bg-danger/5 text-danger",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        variant === "success" && "border-success/20 bg-success/5 text-success",
        variant === "info" && "border-primary/20 bg-primary/5 text-text",
        className,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
      </div>
    </div>
  );
}
