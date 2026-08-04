import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpenText,
  Calendar,
  CalendarClock,
  Database,
  Factory,
  FileText,
  Package,
  Settings2,
  Truck,
  UtensilsCrossed,
  Users,
} from "lucide-react";

export type MasterLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  status?: "ready" | "partial" | "planned";
};

export type MasterSection = {
  heading: string;
  items: MasterLink[];
};

export const MASTER_SECTIONS: MasterSection[] = [
  {
    heading: "施設・組織",
    items: [
      {
        href: "/masters/customers",
        label: "施設",
        description: "施設一覧・編集・成り代わり",
        icon: Users,
        status: "partial",
      },
    ],
  },
  {
    heading: "注文・締切",
    items: [
      {
        href: "/masters/deadlines",
        label: "締切ルール",
        description: "仮注文締切・例外日（正月前倒し）",
        icon: CalendarClock,
        status: "partial",
      },
      {
        href: "/masters/order-suspensions",
        label: "注文停止予約",
        description: "施設ごとの注文停止期間",
        icon: AlertTriangle,
        status: "partial",
      },
    ],
  },
  {
    heading: "区分・献立",
    items: [
      {
        href: "/masters/swallow-categories",
        label: "嚥下食区分",
        description: "表示順・注文入力列の自動追加",
        icon: UtensilsCrossed,
        status: "partial",
      },
      {
        href: "/masters/meal-types",
        label: "食事区分",
        description: "朝食・昼食・夕食など",
        icon: UtensilsCrossed,
        status: "partial",
      },
      {
        href: "/masters/menu-kinds",
        label: "献立種類",
        description: "通常食・嚥下食などの献立区分",
        icon: BookOpenText,
        status: "partial",
      },
      {
        href: "/masters/setout-directions",
        label: "献立定型文",
        description: "盛付指示書の定型文テンプレート",
        icon: FileText,
        status: "partial",
      },
    ],
  },
  {
    heading: "アレルギー・資料",
    items: [
      {
        href: "/masters/allergens",
        label: "アレルギー種類",
        description: "アレルギー区分マスタ",
        icon: AlertTriangle,
        status: "partial",
      },
      {
        href: "/masters/document-output-rules",
        label: "資料出力ルール",
        description: "食種×資料種別の出力設定",
        icon: FileText,
        status: "partial",
      },
    ],
  },
  {
    heading: "発注・製造",
    items: [
      {
        href: "/masters/production-patterns",
        label: "製造パターン",
        description: "集荷日・着日のパターン定義",
        icon: Factory,
        status: "partial",
      },
      {
        href: "/masters/reference-rules",
        label: "参照ロジック",
        description: "発注量計算の参照パターン",
        icon: Settings2,
        status: "partial",
      },
      {
        href: "/masters/suppliers",
        label: "仕入業者",
        description: "発注先業者マスタ",
        icon: Truck,
        status: "partial",
      },
      {
        href: "/masters/stock-items",
        label: "業者別商品",
        description: "発注対象の商品マスタ",
        icon: Package,
        status: "partial",
      },
    ],
  },
  {
    heading: "カレンダー・その他",
    items: [
      {
        href: "/masters/business-calendar",
        label: "営業日カレンダー",
        description: "休業日・締切日の営業日調整",
        icon: Calendar,
        status: "partial",
      },
    ],
  },
];

export function getMasterLink(href: string): MasterLink | undefined {
  for (const section of MASTER_SECTIONS) {
    const item = section.items.find((entry) => entry.href === href);
    if (item) return item;
  }
  return undefined;
}
