"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUnreadNotificationCount } from "@/lib/api";
import {
  filterHeaderItems,
  HEADER_ITEMS,
  resolveActiveHref,
  INTERNAL_SIDEBAR,
  FACILITY_SIDEBAR,
} from "./nav-config";
import { UserMenu } from "./UserMenu";

export function AppHeader() {
  const pathname = usePathname();
  const { user, can } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const sections = user.type === "internal" ? INTERNAL_SIDEBAR : FACILITY_SIDEBAR;
  const headerItems = filterHeaderItems(HEADER_ITEMS, can).map((item) =>
    item.href === "/notifications" ? { ...item, badge: unreadCount } : item,
  );
  const activeHref = resolveActiveHref(pathname, sections, headerItems);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const timer = setInterval(refreshUnreadCount, 60_000);
    const onFocus = () => refreshUnreadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshUnreadCount]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-0.5 border-b border-border bg-sidebar px-4">
      {headerItems.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
              active
                ? "bg-primary/8 font-medium text-primary"
                : "text-muted hover:bg-bg hover:text-text",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
      <UserMenu />
    </header>
  );
}
