"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BookOpenText,
  CalendarClock,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { isAdminRole } from "@/components/auth/AdminOnly";
import { BrandLogo } from "@/components/ui/brand-logo";

const APP_VERSION = "v0.1.0";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
type NavSection = { heading?: string; items: NavItem[] };

const internalNav: NavSection[] = [
  { items: [{ href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard }] },
  {
    heading: "受注",
    items: [{ href: "/orders", label: "注文", icon: ClipboardList }],
  },
  {
    heading: "情報",
    items: [
      { href: "/announcements", label: "お知らせ", icon: Bell },
      { href: "/manual", label: "操作マニュアル", icon: BookOpenText },
    ],
  },
  {
    heading: "発注・在庫",
    items: [
      { href: "/procurement/schedule", label: "発注スケジュール", icon: CalendarClock },
      { href: "/procurement/imports", label: "データ取込", icon: Database },
    ],
  },
  {
    heading: "帳票・配送",
    items: [
      { href: "/documents", label: "献立資料", icon: BookOpenText },
      { href: "/plating-instructions", label: "盛付指示書", icon: UtensilsCrossed },
    ],
  },
  {
    heading: "マスタ",
    items: [{ href: "/masters", label: "マスタ管理", icon: Database }],
  },
  {
    heading: "管理",
    items: [
      { href: "/dashboard/alerts", label: "未入力アラート", icon: AlertTriangle },
      { href: "/admin/users", label: "ユーザー管理", icon: Users },
      { href: "/admin/roles", label: "ロール設定", icon: ShieldCheck },
      { href: "/audit-logs", label: "監査ログ", icon: ScrollText },
      { href: "/settings", label: "設定", icon: Settings },
    ],
  },
];

const facilityNav: NavSection[] = [
  { items: [{ href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard }] },
  {
    heading: "注文",
    items: [{ href: "/orders", label: "注文", icon: ClipboardList }],
  },
  {
    heading: "情報",
    items: [
      { href: "/announcements", label: "お知らせ", icon: Bell },
      { href: "/manual", label: "操作マニュアル", icon: BookOpenText },
    ],
  },
  {
    heading: "資料",
    items: [
      { href: "/documents", label: "献立資料", icon: BookOpenText },
      { href: "/plating-instructions", label: "盛付指示書", icon: FileText },
    ],
  },
  { items: [{ href: "/settings", label: "設定", icon: Settings }] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const sections = user.type === "internal" ? internalNav : facilityNav;
  const showAdminUsers = user.type === "internal" && isAdminRole(user.role);

  const filteredSections =
    user.type === "internal"
      ? sections.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.href !== "/admin/users" || showAdminUsers),
        }))
      : sections;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const currentUserLabel =
    user.type === "internal"
      ? `【${user.employeeCode ?? user.id}】${user.name}`
      : `${user.customerName ?? ""} ${user.name}`.trim();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-3">
        <BrandLogo className="h-7 max-w-full" />
        <span className="text-[11px] font-medium text-muted">業務システム</span>
      </div>

      <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2 py-2">
        {filteredSections.map((section, i) => (
          <div key={section.heading ?? `section-${i}`} className={i > 0 ? "mt-3" : undefined}>
            {section.heading ? (
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {section.heading}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-2 py-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-muted">
          {user.type === "internal" ? (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Users className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{currentUserLabel}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-danger/5 hover:text-danger"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          ログアウト
        </button>
        <p className="mt-1 px-2.5 text-xs text-muted">{APP_VERSION}</p>
      </div>
    </aside>
  );
}
