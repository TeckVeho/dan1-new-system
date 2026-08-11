"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandLogo } from "@/components/ui/brand-logo";
import {
  FACILITY_SIDEBAR,
  filterHeaderItems,
  filterNavSections,
  HEADER_ITEMS,
  INTERNAL_SIDEBAR,
  isSidebarItemActive,
  resolveActiveHref,
} from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();
  const { user, can } = useAuth();

  const sections = user.type === "internal" ? INTERNAL_SIDEBAR : FACILITY_SIDEBAR;
  const headerItems = filterHeaderItems(HEADER_ITEMS, can);
  const filteredSections = filterNavSections(sections, can);
  const activeHref = resolveActiveHref(pathname, sections, headerItems);

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-3">
        <BrandLogo className="h-7 max-w-full" />
        <span className="text-[11px] font-medium text-muted">業務システム</span>
      </div>

      <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2 py-2">
        {filteredSections.map((section, i) => (
          <div key={section.heading ?? `section-${i}`} className={cn(i > 0 && "mt-3")}>
            {section.heading ? (
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {section.heading}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active = isSidebarItemActive(item.href, activeHref, pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-primary/8 font-medium text-primary"
                      : "text-muted hover:bg-bg hover:text-text",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
