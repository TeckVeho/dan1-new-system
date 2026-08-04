import { cn } from "../lib/utils.js";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  padding?: "sm" | "md" | "none";
};

const PADDING_STYLES: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "px-4 py-3",
  md: "px-4 py-4",
};

export function Card({
  className,
  title,
  description,
  actions,
  padding = "md",
  children,
  ...props
}: CardProps) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <div
      className={cn("rounded-lg border border-border bg-white", PADDING_STYLES[padding], className)}
      {...props}
    >
      {hasHeader ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-[15px] font-semibold text-text">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
