import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpenText,
  CalendarClock,
  ClipboardList,
  Database,
  FileText,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  UtensilsCrossed,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  permissionAny?: string[];
  badge?: number;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export type HeaderItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  badge?: number;
};

export type SectionTab = {
  href: string;
  label: string;
  permission?: string;
  internalOnly?: boolean;
};

export type SectionTabGroup = {
  id: string;
  tabs: SectionTab[];
};

export const APP_VERSION = "v0.1.0";

export const SECTION_TAB_GROUPS: SectionTabGroup[] = [
  {
    id: "orders",
    tabs: [
      { href: "/orders", label: "注文一覧", permission: "order.read" },
      { href: "/orders/meal-counts", label: "注文食数の確認", permission: "order.read", internalOnly: true },
      { href: "/orders/rice/logs", label: "合数ログ", permission: "order.read", internalOnly: true },
    ],
  },
  {
    id: "procurement-imports",
    tabs: [
      { href: "/procurement/imports", label: "データ取込", permission: "procurement.import.execute" },
      { href: "/procurement/imports/calendar", label: "取込状況カレンダー", permission: "procurement.import.execute" },
    ],
  },
  {
    id: "procurement-schedule",
    tabs: [
      { href: "/procurement/schedule", label: "発注スケジュール", permission: "procurement.schedule.read" },
      { href: "/procurement/calc-basis", label: "計算根拠の確認", permission: "procurement.schedule.read" },
    ],
  },
  {
    id: "procurement-adjustments",
    tabs: [
      { href: "/procurement/adjustments", label: "食数補正", permission: "procurement.adjustment.update" },
      { href: "/procurement/meal-count-sync", label: "食数データの同期", permission: "procurement.recalculate" },
    ],
  },
];

export const INTERNAL_SIDEBAR: NavSection[] = [
  {
    items: [{ href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard }],
  },
  {
    heading: "受注",
    items: [
      { href: "/orders", label: "注文", icon: ClipboardList, permission: "order.read" },
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
        label: "食数調整",
        icon: ClipboardList,
        permissionAny: ["procurement.adjustment.update", "procurement.recalculate"],
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
      {
        href: "/admin",
        label: "システム管理",
        icon: ShieldCheck,
      },
    ],
  },
];

export const FACILITY_SIDEBAR: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
      { href: "/orders", label: "注文", icon: ClipboardList, permission: "order.read" },
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
];

export const HEADER_ITEMS: HeaderItem[] = [
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/chat", label: "問い合わせ", icon: MessageSquare, permission: "inquiry.read" },
  { href: "/announcements", label: "お知らせ", icon: Megaphone, permission: "announcement.read" },
  { href: "/manual", label: "操作マニュアル", icon: HelpCircle },
];

export function isNavItemVisible(item: NavItem, can: (permission: string) => boolean): boolean {
  if (item.permissionAny?.length) {
    return item.permissionAny.some(can);
  }
  if (item.permission) return can(item.permission);
  return true;
}

export function filterNavSections(
  sections: NavSection[],
  can: (permission: string) => boolean,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(item, can)),
    }))
    .filter((section) => section.items.length > 0);
}

export function filterHeaderItems(
  items: HeaderItem[],
  can: (permission: string) => boolean,
): HeaderItem[] {
  return items.filter((item) => !item.permission || can(item.permission));
}

export function getSectionTabGroup(groupId: string): SectionTabGroup | undefined {
  return SECTION_TAB_GROUPS.find((group) => group.id === groupId);
}

export function filterSectionTabs(
  groupId: string,
  can: (permission: string) => boolean,
  userType: "internal" | "facility",
): SectionTab[] {
  const group = getSectionTabGroup(groupId);
  if (!group) return [];
  return group.tabs.filter((tab) => {
    if (tab.internalOnly && userType !== "internal") return false;
    if (tab.permission && !can(tab.permission)) return false;
    return true;
  });
}

/** サイドバー・ヘッダー・セクションタブの全 href から、現在パスに最も具体的に一致する href を返す */
export function resolveActiveHref(
  pathname: string,
  sections: NavSection[],
  headerItems: HeaderItem[],
  tabGroups: SectionTabGroup[] = SECTION_TAB_GROUPS,
): string | undefined {
  const allHrefs = [
    ...sections.flatMap((section) => section.items.map((item) => item.href)),
    ...headerItems.map((item) => item.href),
    ...tabGroups.flatMap((group) => group.tabs.map((tab) => tab.href)),
    "/settings",
  ];

  return allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/** サイドバー項目がアクティブか（タブ配下の URL も含む） */
export function isSidebarItemActive(itemHref: string, activeHref: string | undefined, pathname: string): boolean {
  if (!activeHref) return pathname === itemHref || pathname.startsWith(`${itemHref}/`);

  if (activeHref === itemHref) return true;

  const tabGroup = SECTION_TAB_GROUPS.find((group) => group.tabs.some((tab) => tab.href === itemHref));
  if (tabGroup?.tabs.some((tab) => tab.href === activeHref)) {
    const parentHref = tabGroup.tabs[0]?.href;
    const groupParent =
      tabGroup.id === "orders"
        ? "/orders"
        : tabGroup.id === "procurement-imports"
          ? "/procurement/imports"
          : tabGroup.id === "procurement-schedule"
            ? "/procurement/schedule"
            : tabGroup.id === "procurement-adjustments"
              ? "/procurement/adjustments"
              : parentHref;
    return itemHref === groupParent;
  }

  if (itemHref === "/admin") {
    return (
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/audit-logs" ||
      pathname.startsWith("/audit-logs/") ||
      pathname === "/settings" ||
      pathname.startsWith("/settings/")
    );
  }

  if (itemHref === "/masters") {
    return pathname === "/masters" || pathname.startsWith("/masters/") || pathname === "/delivery-dates";
  }

  return false;
}
