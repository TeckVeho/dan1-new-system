import {
  productionReportParamsSchema,
  procurementScheduleReportParamsSchema,
  ordersCsvReportParamsSchema,
  mealCountSyncReportParamsSchema,
  deliveryLabelReportParamsSchema,
  monthlyMealCountReportParamsSchema,
  rawMaterialOrderReportParamsSchema,
  pouchSealReportParamsSchema,
  p7PrintCsvReportParamsSchema,
  pickingInstructionReportParamsSchema,
  bagDesignReportParamsSchema,
  salesPriceReportParamsSchema,
} from "@dan1/shared";
import type { ReportParamField } from "./types.js";

export const MEAL_COUNT_SYNC_PARAM_FIELDS: ReportParamField[] = [
  { key: "dateFrom", label: "対象期間（開始）", type: "date", required: true },
  { key: "dateTo", label: "対象期間（終了）", type: "date", required: true },
  {
    key: "format",
    label: "形式",
    type: "select",
    required: true,
    options: [
      { value: "csv", label: "CSV" },
      { value: "xlsx", label: "Excel (.xlsx)" },
    ],
  },
];

export const PRODUCTION_PARAM_FIELDS: ReportParamField[] = [
  { key: "serviceDateFrom", label: "喫食日（開始）", type: "date", required: true },
  { key: "serviceDateTo", label: "喫食日（終了）", type: "date", required: true },
  { key: "customerId", label: "施設ID", type: "string", placeholder: "未指定＝全施設" },
  {
    key: "format",
    label: "形式",
    type: "select",
    required: true,
    options: [
      { value: "xlsx", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV" },
    ],
  },
];

export const PROCUREMENT_SCHEDULE_PARAM_FIELDS: ReportParamField[] = [
  { key: "supplierId", label: "仕入業者ID", type: "string", required: true },
  { key: "deliveryFrom", label: "納品日（開始）", type: "date", required: true },
  { key: "deliveryTo", label: "納品日（終了）", type: "date", required: true },
  { key: "category", label: "カテゴリ", type: "string" },
  { key: "search", label: "検索", type: "string" },
  {
    key: "shortageOnly",
    label: "不足のみ",
    type: "boolean",
  },
  {
    key: "format",
    label: "形式",
    type: "select",
    required: true,
    options: [
      { value: "xlsx", label: "Excel (.xlsx)" },
      { value: "csv", label: "CSV" },
    ],
  },
];

export const ORDERS_CSV_PARAM_FIELDS: ReportParamField[] = [
  { key: "serviceDateFrom", label: "喫食日（開始）", type: "date" },
  { key: "serviceDateTo", label: "喫食日（終了）", type: "date" },
  { key: "customerId", label: "施設ID", type: "string" },
  { key: "search", label: "施設検索", type: "string" },
  { key: "unitId", label: "ユニットID", type: "string" },
  { key: "mealTypeId", label: "食事区分ID", type: "string" },
  { key: "menuKindId", label: "献立種類ID", type: "string" },
  {
    key: "status",
    label: "状態",
    type: "select",
    options: [
      { value: "draft", label: "下書き" },
      { value: "provisional", label: "仮確定" },
      { value: "confirmed", label: "確定" },
    ],
  },
  {
    key: "format",
    label: "形式",
    type: "select",
    required: true,
    options: [{ value: "csv", label: "CSV" }],
  },
];

export {
  productionReportParamsSchema,
  procurementScheduleReportParamsSchema,
  ordersCsvReportParamsSchema,
  mealCountSyncReportParamsSchema,
  deliveryLabelReportParamsSchema,
  monthlyMealCountReportParamsSchema,
  rawMaterialOrderReportParamsSchema,
  pouchSealReportParamsSchema,
  p7PrintCsvReportParamsSchema,
  pickingInstructionReportParamsSchema,
  bagDesignReportParamsSchema,
  salesPriceReportParamsSchema,
};
