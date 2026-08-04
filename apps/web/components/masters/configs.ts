import type { SimpleMasterConfig } from "./SimpleMasterCrudPage";

const CODE_NAME_FIELDS = [
  { key: "code", label: "コード", required: true },
  { key: "name", label: "名称", required: true, colSpan: 2 },
  { key: "sortOrder", label: "表示順", type: "number" as const },
  { key: "isActive", label: "有効", type: "checkbox" as const },
];

export const MEAL_TYPE_CONFIG: SimpleMasterConfig = {
  resource: "meal-types",
  title: "食事区分",
  description: "朝食・昼食・夕食などの食事区分マスタ",
  fields: CODE_NAME_FIELDS,
};

export const MENU_KIND_CONFIG: SimpleMasterConfig = {
  resource: "menu-kinds",
  title: "献立種類",
  description: "通常食・嚥下食などの献立種類マスタ",
  fields: [
    ...CODE_NAME_FIELDS.slice(0, 2),
    { key: "swallowCategoryId", label: "嚥下食区分ID", placeholder: "任意" },
    ...CODE_NAME_FIELDS.slice(2),
  ],
};

export const ALLERGEN_CONFIG: SimpleMasterConfig = {
  resource: "allergens",
  title: "アレルギー種類",
  description: "アレルギー区分のマスタ（REQ-12）",
  fields: CODE_NAME_FIELDS,
};

export const SUPPLIER_CONFIG: SimpleMasterConfig = {
  resource: "suppliers",
  title: "仕入業者",
  description: "発注先の仕入業者マスタ",
  fields: CODE_NAME_FIELDS,
};

export const PRODUCTION_PATTERN_CONFIG: SimpleMasterConfig = {
  resource: "production-patterns",
  title: "製造パターン",
  description: "集荷日・着日のパターン定義（REQ-08）",
  fields: [
    { key: "code", label: "コード", required: true },
    { key: "name", label: "名称", required: true, colSpan: 2 },
    { key: "leadDays", label: "リードタイム（日）", type: "number", required: true },
    { key: "sortOrder", label: "表示順", type: "number" },
    { key: "isActive", label: "有効", type: "checkbox" },
  ],
};

export const REFERENCE_RULE_CONFIG: SimpleMasterConfig = {
  resource: "reference-rules",
  title: "参照ロジック",
  description: "発注量計算の参照パターン（REQ-21）",
  fields: [
    { key: "code", label: "コード", required: true },
    { key: "name", label: "名称", required: true, colSpan: 2 },
    { key: "ruleConfig", label: "ルール設定（JSON）", type: "textarea", colSpan: 4, list: false },
    { key: "sortOrder", label: "表示順", type: "number" },
    { key: "isActive", label: "有効", type: "checkbox" },
  ],
  listColumns: ["code", "name", "sortOrder", "isActive"],
};

export const SETOUT_DIRECTION_CONFIG: SimpleMasterConfig = {
  resource: "setout-directions",
  title: "献立定型文",
  description: "盛付指示書の定型文テンプレート（REQ-18）",
  fields: [
    { key: "title", label: "タイトル", required: true, colSpan: 2 },
    { key: "body", label: "本文", type: "textarea", required: true, colSpan: 4, list: false },
    { key: "sortOrder", label: "表示順", type: "number" },
  ],
  listColumns: ["title", "sortOrder"],
};

export const ORDER_SUSPENSION_CONFIG: SimpleMasterConfig = {
  resource: "order-suspensions",
  title: "注文停止予約",
  description: "施設ごとの注文停止期間を登録します",
  fields: [
    { key: "customerId", label: "施設ID", required: true },
    { key: "startDate", label: "停止開始日", type: "date", required: true },
    { key: "endDate", label: "停止終了日", type: "date" },
    { key: "reason", label: "理由", colSpan: 2 },
  ],
  listColumns: ["customerId", "startDate", "endDate", "reason"],
};

export const BUSINESS_CALENDAR_CONFIG: SimpleMasterConfig = {
  resource: "business-calendars",
  title: "営業日カレンダー",
  description: "休業日の登録。締切日の営業日調整に使用します",
  fields: [
    { key: "calDate", label: "日付", type: "date", required: true },
    { key: "isHoliday", label: "休業日", type: "checkbox" },
    { key: "note", label: "メモ", colSpan: 2 },
  ],
  listColumns: ["calDate", "isHoliday", "note"],
};

export const DOCUMENT_OUTPUT_RULE_CONFIG: SimpleMasterConfig = {
  resource: "document-output-rules",
  title: "資料出力ルール",
  description: "食種×資料種別の出力マトリクス（REQ-11）",
  fields: [
    { key: "mealTypeCode", label: "食事区分コード", required: true },
    { key: "documentType", label: "資料種別", required: true },
    { key: "isEnabled", label: "出力する", type: "checkbox" },
    { key: "sortOrder", label: "表示順", type: "number" },
  ],
};

export const STOCK_ITEM_CONFIG: SimpleMasterConfig = {
  resource: "stock-items",
  title: "業者別商品",
  description: "発注対象の商品マスタ",
  fields: [
    { key: "supplierId", label: "仕入業者ID", required: true },
    { key: "itemCode", label: "品番", required: true },
    { key: "name", label: "商品名", required: true, colSpan: 2 },
    { key: "category", label: "カテゴリ" },
    { key: "unit", label: "単位", required: true },
    { key: "sortOrder", label: "表示順", type: "number" },
    { key: "isActive", label: "有効", type: "checkbox" },
  ],
};
