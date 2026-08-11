"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { ADMIN_LINKS } from "./catalog";

export function AdminHub() {
  const { can } = useAuth();
  const items = ADMIN_LINKS.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
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
              <p className="text-[14px] font-medium text-text">{item.label}</p>
              <p className="mt-0.5 text-[12px] text-muted">{item.description}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
