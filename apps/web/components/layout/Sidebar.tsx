"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpenText,
  CalendarClock,
  ClipboardList,
  Database,
  FileUp,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  MessageSquare,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { BrandLogo } from "@/components/ui/brand-logo";
import { getUnreadNotificationCount } from "@/lib/api";

const APP_VERSION = "v0.1.0";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  badge?: number;
};
type NavSection = { heading?: string; pinToBottom?: boolean; items: NavItem[] };

const internalNav: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
      { href: "/notifications", label: "通知", icon: Bell },
      { href: "/chat", label: "問い合わせ", icon: MessageSquare, permission: "inquiry.read" },
    ],
  },
  {
    heading: "受注",
    items: [
      { href: "/orders", label: "注文", icon: ClipboardList, permission: "order.read" },
      { href: "/orders/meal-counts", label: "注文食数の確認", icon: ClipboardList, permission: "order.read" },
      { href: "/orders/rice/logs", label: "合数ログ", icon: ScrollText, permission: "order.read" },
      {
        href: "/dashboard/alerts",
        label: "未入力アラート",
        icon: AlertTriangle,
        permission: "order_alert.read",
      },
    ],
  },
  {
    heading: "献立・盛付",
    items: [
      { href: "/documents", label: "献立資料", icon: BookOpenText, permission: "document.read" },
      {
        href: "/plating-instructions",
        label: "盛付指示書",
        icon: UtensilsCrossed,
        permission: "document.read",
      },
      { href: "/reports", label: "帳票出力", icon: FileText, permission: "report.read" },
    ],
  },
  {
    heading: "発注・在庫",
    items: [
      {
        href: "/procurement/imports",
        label: "データ取込",
        icon: FileUp,
        permission: "procurement.import.execute",
      },
      {
        href: "/procurement/imports/calendar",
        label: "取込状況カレンダー",
        icon: CalendarClock,
        permission: "procurement.import.execute",
      },
      {
        href: "/procurement/meal-count-sync",
        label: "食数データの同期",
        icon: Activity,
        permission: "procurement.recalculate",
      },
      {
        href: "/procurement/schedule",
        label: "発注スケジュール",
        icon: CalendarClock,
        permission: "procurement.schedule.read",
      },
      {
        href: "/procurement/stock-records",
        label: "棚卸",
        icon: Database,
        permission: "procurement.stock_record.update",
      },
      {
        href: "/procurement/adjustments",
        label: "食数補正",
        icon: ClipboardList,
        permission: "procurement.adjustment.update",
      },
      {
        href: "/procurement/calc-basis",
        label: "計算根拠の確認",
        icon: ScrollText,
        permission: "procurement.schedule.read",
      },
      {
        href: "/delivery-dates",
        label: "配送日プレビュー",
        icon: CalendarClock,
        permission: "master.read",
      },
    ],
  },
  {
    heading: "請求",
    items: [
      { href: "/invoices", label: "請求", icon: Receipt, permission: "invoice.read" },
      { href: "/sales-prices", label: "売価計算", icon: Receipt, permission: "sales_price.read" },
    ],
  },
  {
    heading: "管理",
    items: [
      { href: "/masters", label: "マスタ管理", icon: Database, permission: "master.read" },
      { href: "/admin/jobs", label: "処理状況", icon: Activity, permission: "admin.job.read" },
      { href: "/admin/users", label: "ユーザー管理", icon: Users, permission: "admin.user.read" },
      { href: "/admin/roles", label: "ロール設定", icon: ShieldCheck, permission: "admin.role.update" },
      { href: "/audit-logs", label: "監査ログ", icon: ScrollText, permission: "admin.audit_log.read" },
      { href: "/settings", label: "設定", icon: Settings },
    ],
  },
  {
    pinToBottom: true,
    items: [
      { href: "/announcements", label: "お知らせ", icon: Megaphone, permission: "announcement.read" },
      { href: "/manual", label: "操作マニュアル", icon: HelpCircle },
    ],
  },
];

const facilityNav: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
      { href: "/orders", label: "注文", icon: ClipboardList, permission: "order.read" },
      { href: "/notifications", label: "通知", icon: Bell },
      { href: "/chat", label: "問い合わせ", icon: MessageSquare, permission: "inquiry.read" },
    ],
  },
  {
    heading: "資料",
    items: [
      { href: "/documents", label: "献立資料", icon: BookOpenText, permission: "document.read" },
      {
        href: "/plating-instructions",
        label: "盛付指示書",
        icon: UtensilsCrossed,
        permission: "document.read",
      },
      { href: "/invoices", label: "請求", icon: Receipt, permission: "invoice.read" },
    ],
  },
  {
    pinToBottom: true,
    items: [
      { href: "/announcements", label: "お知らせ", icon: Megaphone, permission: "announcement.read" },
      { href: "/manual", label: "操作マニュアル", icon: HelpCircle },
      { href: "/settings", label: "設定", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, can } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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

  const sections = user.type === "internal" ? internalNav : facilityNav;

  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => !item.permission || can(item.permission))
        .map((item) =>
          item.href === "/notifications" ? { ...item, badge: unreadCount } : item,
        ),
    }))
    .filter((section) => section.items.length > 0);

  // 現在のパスに前方一致する項目のうち、最も具体的な1件だけを選択状態にする
  const activeHref = filteredSections
    .flatMap((section) => section.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

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
          <div
            key={section.heading ?? `section-${i}`}
            className={cn(i > 0 && "mt-3", section.pinToBottom && "mt-auto pt-3")}
          >
            {section.heading ? (
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {section.heading}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active = item.href === activeHref;
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
                  {item.badge && item.badge > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
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
