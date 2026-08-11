import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  BookOpenText,
  Calendar,
  CalendarClock,
  Factory,
  FileText,
  Package,
  Settings2,
  Tag,
  Truck,
  UtensilsCrossed,
  Users,
  Wheat,
  Receipt,
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
        description: "施設一覧・編集・新規登録・成り代わり",
        icon: Users,
        status: "ready",
      },
      {
        href: "/masters/customer-groups",
        label: "施設グループ",
        description: "施設をグループにまとめて扱います",
        icon: Users,
        status: "ready",
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
      {
        href: "/masters/order-types",
        label: "注文区分",
        description: "通常・試食会などの区分",
        icon: Tag,
        status: "ready",
      },
      {
        href: "/masters/long-holidays",
        label: "長期休暇",
        description: "未入力アラート除外に使う休暇期間",
        icon: Calendar,
        status: "ready",
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
      {
        href: "/masters/rice-types",
        label: "混ぜご飯・合数種別",
        description: "合数指定で選択するご飯の種類",
        icon: Wheat,
        status: "ready",
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
        href: "/masters/diet-types",
        label: "食種",
        description: "常食・薄味・汁無しなどの食種区分",
        icon: UtensilsCrossed,
        status: "partial",
      },
      {
        href: "/masters/document-output-rules",
        label: "資料出力ルール",
        description: "食種×資料種別の出力設定・施設別上書き",
        icon: FileText,
        status: "ready",
      },
    ],
  },
  {
    heading: "発注・製造",
    items: [
      {
        href: "/masters/production-patterns",
        label: "製造パターン",
        description: "集荷日D0〜D3・着日D1〜D3のパターン定義",
        icon: Factory,
        status: "ready",
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
        description: "発注対象の商品マスタ（原体フラグ対応）",
        icon: Package,
        status: "partial",
      },
      {
        href: "/masters/picking-destinations",
        label: "ピッキング出力先",
        description: "商品ごとのピッキング出力先設定",
        icon: Package,
        status: "ready",
      },
      {
        href: "/masters/bag-designs",
        label: "袋の集約設計",
        description: "施設の袋設計とユニット割当",
        icon: Package,
        status: "ready",
      },
    ],
  },
  {
    heading: "請求",
    items: [
      {
        href: "/masters/unit-prices",
        label: "単価マスタ",
        description: "献立種類ごとの単価（施設別・共通）",
        icon: Receipt,
        status: "ready",
      },
      {
        href: "/masters/tax-rates",
        label: "税率マスタ",
        description: "消費税率の適用期間管理",
        icon: Tag,
        status: "ready",
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
      {
        href: "/masters/announcements",
        label: "お知らせ管理",
        description: "施設向けお知らせの登録・編集",
        icon: Bell,
        status: "ready",
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
