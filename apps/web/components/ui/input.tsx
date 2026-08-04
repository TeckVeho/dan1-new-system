"use client";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function Input({
  className,
  label,
  hint,
  error,
  leadingIcon,
  trailing,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const describedById = hint || error ? `${inputId}-description` : undefined;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-muted">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70">
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted/50 outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-bg/70 disabled:text-muted",
            leadingIcon && "pl-10",
            trailing && "pr-10",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{trailing}</span>
        ) : null}
      </div>
      {error ? (
        <p id={describedById} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
