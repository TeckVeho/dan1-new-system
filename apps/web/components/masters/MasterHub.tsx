"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MASTER_SECTIONS, type MasterLink } from "./catalog";

const STATUS_LABEL = {
  ready: "利用可",
  partial: "一部実装",
  planned: "未実装",
} as const;

function StatusBadge({ status }: { status: MasterLink["status"] }) {
  if (!status || status === "ready") return null;
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        status === "partial" ? "bg-warning/10 text-warning" : "bg-muted/10 text-muted",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function MasterHub() {
  return (
    <div className="space-y-6">
      {MASTER_SECTIONS.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{section.heading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex gap-3 rounded-lg border border-border bg-white px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-text">{item.label}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function MasterSubNav({ currentHref }: { currentHref?: string }) {
  const pathname = usePathname();
  const activeHref = currentHref ?? pathname;

  return (
    <nav className="w-52 shrink-0 space-y-4 border-r border-border pr-3">
      {MASTER_SECTIONS.map((section) => (
        <div key={section.heading}>
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{section.heading}</p>
          <ul className="space-y-px">
            {section.items.map((item) => {
              const active = activeHref === item.href || activeHref.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      active ? "bg-primary/8 font-medium text-primary" : "text-muted hover:bg-bg hover:text-text",
                    )}
                  >
                    <span>{item.label}</span>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MasterWorkspace({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h1 className="text-[16px] font-semibold text-text">{title}</h1>
        {description ? <p className="mt-1 text-[12px] text-muted">{description}</p> : null}
      </div>
      <div className="flex min-h-[480px]">
        <div className="hidden border-r border-border p-3 lg:block">
          <MasterSubNav />
        </div>
        <div className="min-w-0 flex-1 p-4">{children}</div>
      </div>
    </div>
  );
}
