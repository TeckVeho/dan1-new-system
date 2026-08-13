"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { ACCOUNT_MENU_ITEMS, APP_VERSION, filterHeaderItems } from "./nav-config";

export function UserMenu() {
  const { user, logout, can } = useAuth();
  const accountMenuItems = filterHeaderItems(ACCOUNT_MENU_ITEMS, can);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentUserLabel =
    user.type === "internal"
      ? `【${user.employeeCode ?? user.id}】${user.name}`
      : `${user.customerName ?? ""} ${user.name}`.trim();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleLogout = useCallback(async () => {
    setOpen(false);
    await logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <div ref={menuRef} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-8 max-w-[200px] items-center gap-1.5 rounded-md px-2 text-[13px] transition-colors",
          open ? "bg-bg text-text" : "text-muted hover:bg-bg hover:text-text",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.type === "internal" ? (
          <ShieldCheck className="h-4 w-4 shrink-0" />
        ) : (
          <Users className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{user.name}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-[13px] font-medium text-text">{currentUserLabel}</p>
            <p className="mt-0.5 text-[11px] text-muted">{user.type === "internal" ? "社内ユーザー" : "施設ユーザー"}</p>
          </div>
          {accountMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-text hover:bg-bg"
              >
                <Icon className="h-4 w-4 text-muted" />
                {item.label}
              </Link>
            );
          })}
          {accountMenuItems.length > 0 ? <div className="my-1 border-t border-border" /> : null}
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-text hover:bg-bg"
          >
            <Settings className="h-4 w-4 text-muted" />
            設定
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger/5"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
          <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted">{APP_VERSION}</p>
        </div>
      ) : null}
    </div>
  );
}
