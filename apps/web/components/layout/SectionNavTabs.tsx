"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { filterSectionTabs, type SectionTab } from "./nav-config";

function isTabActive(tabHref: string, pathname: string, tabs: SectionTab[]): boolean {
  const matches = tabs
    .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href === tabHref;
}

export function SectionNavTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const { user, can } = useAuth();
  const tabs = filterSectionTabs(groupId, can, user.type);

  if (tabs.length <= 1) return null;

  return (
    <nav className="mb-5 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = isTabActive(tab.href, pathname, tabs);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              active
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted hover:border-border hover:text-text",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
