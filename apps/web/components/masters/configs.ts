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
    {
      key: "swallowCategoryId",
      label: "嚥下食区分",
      type: "select" as const,
      resourceRef: "swallow-categories",
      optionValueKey: "id",
      optionLabelKey: "name",
      placeholder: "任意",
    },
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
  description: "集荷日D0〜D3・着日D1〜D3のパターン定義（REQ-08）",
  fields: [
    { key: "code", label: "コード", required: true },
    { key: "name", label: "名称", required: true, colSpan: 2 },
    { key: "leadDays", label: "リードタイム（日）", type: "number", required: true },
    { key: "pickupOffsetD0", label: "集荷D0", type: "number" },
    { key: "pickupOffsetD1", label: "集荷D1", type: "number" },
    { key: "pickupOffsetD2", label: "集荷D2", type: "number" },
    { key: "pickupOffsetD3", label: "集荷D3", type: "number" },
    { key: "arrivalOffsetD1", label: "着日D1", type: "number" },
    { key: "arrivalOffsetD2", label: "着日D2", type: "number" },
    { key: "arrivalOffsetD3", label: "着日D3", type: "number" },
    { key: "carrierCode", label: "配送業者コード", placeholder: "sagawa / yamato 等" },
    { key: "sortOrder", label: "表示順", type: "number" },
    { key: "isActive", label: "有効", type: "checkbox" },
  ],
  listColumns: ["code", "name", "leadDays", "carrierCode", "sortOrder", "isActive"],
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

export const ORDER_SUSPENSION_CONFIG: SimpleMasterConfig = {
  resource: "order-suspensions",
  title: "注文停止予約",
  description: "施設ごとの注文停止期間を登録します",
  fields: [
    {
      key: "customerId",
      label: "施設",
      type: "select",
      required: true,
      resourceRef: "customers",
      optionValueKey: "id",
      optionLabelKey: "name",
    },
    { key: "startDate", label: "停止開始日", type: "date", required: true },
    { key: "endDate", label: "停止終了日", type: "date" },
    { key: "reason", label: "理由", colSpan: 2 },
  ],
  listColumns: ["customerId", "startDate", "endDate", "reason"],
  softDelete: false,
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
  softDelete: false,
};

export const DOCUMENT_OUTPUT_RULE_CONFIG: SimpleMasterConfig = {
  resource: "document-output-rules",
  title: "資料出力ルール",
  description: "食種×資料種別の出力マトリクス（REQ-11）",
  fields: [
    {
      key: "dietTypeCode",
      label: "食種",
      type: "select",
      required: true,
      resourceRef: "diet-types",
      optionValueKey: "code",
      optionLabelKey: "name",
    },
    {
      key: "documentType",
      label: "資料種別",
      type: "select",
      required: true,
      options: [
        { value: "menu_sheet", label: "献立表" },
        { value: "nutrition_report", label: "栄養月報" },
        { value: "plating_instruction", label: "盛付指示書" },
      ],
    },
    { key: "isEnabled", label: "出力する", type: "checkbox" },
    { key: "sortOrder", label: "表示順", type: "number" },
    { key: "validFrom", label: "有効開始日", type: "date" },
    { key: "validTo", label: "有効終了日", type: "date" },
  ],
  softDelete: false,
};

export const DIET_TYPE_CONFIG: SimpleMasterConfig = {
  resource: "diet-types",
  title: "食種",
  description: "施設の食種区分（常食・薄味・汁無しなど）",
  fields: CODE_NAME_FIELDS,
};

export const STOCK_ITEM_CONFIG: SimpleMasterConfig = {
  resource: "stock-items",
  title: "業者別商品",
  description: "発注対象の商品マスタ",
  fields: [
    {
      key: "supplierId",
      label: "仕入業者",
      type: "select",
      required: true,
      resourceRef: "suppliers",
      optionValueKey: "id",
      optionLabelKey: "name",
    },
    { key: "itemCode", label: "品番", required: true },
    { key: "name", label: "商品名", required: true, colSpan: 2 },
    { key: "category", label: "カテゴリ" },
    { key: "unit", label: "単位", required: true },
    { key: "sortOrder", label: "表示順", type: "number" },
    { key: "isActive", label: "有効", type: "checkbox" },
  ],
};

export const CUSTOMER_GROUP_CONFIG: SimpleMasterConfig = {
  resource: "customer-groups",
  title: "施設グループ",
  description: "施設をグループにまとめて扱います",
  fields: CODE_NAME_FIELDS,
};

export const ORDER_TYPE_CONFIG: SimpleMasterConfig = {
  resource: "order-types",
  title: "注文区分",
  description: "通常・試食会などの注文区分を設定します",
  fields: [
    { key: "code", label: "コード", required: true },
    { key: "name", label: "名称", required: true, colSpan: 2 },
    { key: "linksToProductionReports", label: "製造帳票に反映", type: "checkbox" },
    { key: "linksToSales", label: "売上に反映", type: "checkbox" },
    { key: "sortOrder", label: "表示順", type: "number" },
    { key: "isActive", label: "有効", type: "checkbox" },
  ],
  listColumns: ["code", "name", "linksToProductionReports", "linksToSales", "sortOrder", "isActive"],
};

export const RICE_TYPE_CONFIG: SimpleMasterConfig = {
  resource: "rice-types",
  title: "混ぜご飯・合数種別",
  description: "合数指定で選択するご飯の種類マスタ",
  fields: CODE_NAME_FIELDS,
};

export const LONG_HOLIDAY_CONFIG: SimpleMasterConfig = {
  resource: "long-holidays",
  title: "長期休暇",
  description: "施設または全施設共通の長期休暇期間。未入力アラートの除外に使用します",
  fields: [
    {
      key: "customerId",
      label: "施設",
      type: "select",
      resourceRef: "customers",
      optionValueKey: "id",
      optionLabelKey: "name",
      placeholder: "未選択＝全施設共通",
    },
    { key: "name", label: "名称", colSpan: 2 },
    { key: "startDate", label: "開始日", type: "date", required: true },
    { key: "endDate", label: "終了日", type: "date", required: true },
    { key: "reason", label: "理由", colSpan: 2 },
  ],
  listColumns: ["name", "customerId", "startDate", "endDate", "reason"],
  softDelete: false,
};

export const ANNOUNCEMENT_CONFIG: SimpleMasterConfig = {
  resource: "announcements",
  title: "お知らせ管理",
  description: "施設向けお知らせの登録・編集・掲載期間の管理",
  fields: [
    { key: "title", label: "タイトル", required: true, colSpan: 2 },
    { key: "body", label: "本文", type: "textarea", required: true, colSpan: 4, list: false },
    { key: "category", label: "カテゴリ", required: true },
    {
      key: "severity",
      label: "重要度",
      type: "select",
      required: true,
      options: [
        { value: "info", label: "通常" },
        { value: "important", label: "重要" },
      ],
    },
    { key: "isPinned", label: "固定表示", type: "checkbox" },
    { key: "publishFrom", label: "掲載開始", type: "datetime-local", required: true },
    { key: "publishTo", label: "掲載終了", type: "datetime-local" },
    {
      key: "audience",
      label: "配信先",
      type: "select",
      options: [
        { value: "all", label: "全員" },
        { value: "internal", label: "社内のみ" },
        { value: "facility", label: "施設のみ" },
      ],
    },
    {
      key: "targetScopeType",
      label: "対象範囲",
      type: "select",
      options: [
        { value: "all", label: "全施設" },
        { value: "customer", label: "施設指定" },
        { value: "customer_group", label: "施設グループ指定" },
      ],
    },
    {
      key: "targetScopeId",
      label: "対象ID",
      placeholder: "施設またはグループのID",
    },
    { key: "isActive", label: "有効", type: "checkbox" },
  ],
  listColumns: ["title", "category", "severity", "publishFrom", "isActive"],
  softDelete: false,
};
