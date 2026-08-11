import { productionReportParamsSchema } from "../params.js";
import {
  dateKey,
  fetchAllergenOrdersForReport,
  fetchMealOrdersForReport,
  parseDateParam,
  safeFilenamePart,
  toSpreadsheetFile,
} from "../helpers.js";
import type { ReportDefinition } from "../types.js";
import { PRODUCTION_PARAM_FIELDS } from "../params.js";

function resolveProductionParams(params: Record<string, unknown>) {
  const input = productionReportParamsSchema.parse(params);
  return {
    serviceDateFrom: parseDateParam(input.serviceDateFrom),
    serviceDateTo: parseDateParam(input.serviceDateTo),
    customerId: input.customerId ? BigInt(input.customerId) : undefined,
    format: input.format,
    rangeLabel: `${input.serviceDateFrom}_${input.serviceDateTo}`,
  };
}

export const mealCountSummaryReport: ReportDefinition = {
  key: "meal_count_summary",
  name: "食数集計表",
  description: "施設・ユニット・献立種類別の食数を集計します（仮フォーマット）",
  category: "production",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "食数を集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const header = ["喫食日", "施設コード", "施設名", "ユニット", "食事区分", "献立種類", "注文区分", "食数"];
    const rows = orders.map((order) => [
      dateKey(order.serviceDate),
      order.customer.customerCode,
      order.customer.name,
      order.unit.name,
      order.mealType.name,
      order.menuKind.name,
      order.orderType.name,
      order.quantity,
    ]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "食数集計表",
      header,
      rows,
      filenameBase: `食数集計表_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};

export const productionPlanReport: ReportDefinition = {
  key: "production_plan",
  name: "製造作成表",
  description: "献立種類・食事区分ごとの製造食数を集計します（仮フォーマット）",
  category: "production",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "製造食数を集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const totals = new Map<string, { serviceDate: string; menuKind: string; mealType: string; qty: number }>();
    for (const order of orders) {
      const key = `${dateKey(order.serviceDate)}:${order.menuKindId}:${order.mealTypeId}`;
      const existing = totals.get(key);
      if (existing) {
        existing.qty += order.quantity;
      } else {
        totals.set(key, {
          serviceDate: dateKey(order.serviceDate),
          menuKind: order.menuKind.name,
          mealType: order.mealType.name,
          qty: order.quantity,
        });
      }
    }

    const header = ["喫食日", "献立種類", "食事区分", "合計食数", "備考"];
    const rows = [...totals.values()]
      .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || a.menuKind.localeCompare(b.menuKind))
      .map((row) => [row.serviceDate, row.menuKind, row.mealType, row.qty, ""]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "製造作成表",
      header,
      rows,
      filenameBase: `製造作成表_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};

export const convertedCookingReport: ReportDefinition = {
  key: "converted_cooking",
  name: "変換後調理表",
  description: "献立種類ごとの調理数量を出力します（仮フォーマット・料理名は献立種類名で代替）",
  category: "production",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "調理数量を集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const totals = new Map<string, { serviceDate: string; menuKind: string; qty: number }>();
    for (const order of orders) {
      const key = `${dateKey(order.serviceDate)}:${order.menuKindId}`;
      const existing = totals.get(key);
      if (existing) existing.qty += order.quantity;
      else {
        totals.set(key, {
          serviceDate: dateKey(order.serviceDate),
          menuKind: order.menuKind.name,
          qty: order.quantity,
        });
      }
    }

    const header = ["喫食日", "献立種類", "料理名(仮)", "調理区分", "数量", "単位"];
    const rows = [...totals.values()]
      .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))
      .map((row) => [row.serviceDate, row.menuKind, row.menuKind, "調理", row.qty, "食"]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "変換後調理表",
      header,
      rows,
      filenameBase: `変換後調理表_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};

export const measureSheetReport: ReportDefinition = {
  key: "measure_sheet",
  name: "計量表",
  description: "ユニット・献立種類別の計量数量を出力します（仮フォーマット）",
  category: "production",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "計量データを集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const header = ["喫食日", "施設名", "ユニット", "献立種類", "計量項目(仮)", "数量", "単位"];
    const rows = orders.map((order) => [
      dateKey(order.serviceDate),
      order.customer.name,
      order.unit.name,
      order.menuKind.name,
      `${order.menuKind.name}分量`,
      order.quantity,
      "食",
    ]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "計量表",
      header,
      rows,
      filenameBase: `計量表_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};

export const heatingRecordReport: ReportDefinition = {
  key: "heating_record",
  name: "加熱加工記録簿",
  description: "HACCP 加熱加工記録のひな型を出力します（仮フォーマット・記入欄のみ）",
  category: "production",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "加熱対象を集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const dishes = new Map<string, { serviceDate: string; menuKind: string; qty: number }>();
    for (const order of orders) {
      const key = `${dateKey(order.serviceDate)}:${order.menuKindId}`;
      const existing = dishes.get(key);
      if (existing) existing.qty += order.quantity;
      else {
        dishes.set(key, {
          serviceDate: dateKey(order.serviceDate),
          menuKind: order.menuKind.name,
          qty: order.quantity,
        });
      }
    }

    const header = ["喫食日", "料理名(仮)", "加熱開始", "中心温度(℃)", "加熱終了", "数量", "担当者"];
    const rows = [...dishes.values()].map((row) => [row.serviceDate, row.menuKind, "", "", "", row.qty, ""]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "加熱加工記録簿",
      header,
      rows,
      filenameBase: `加熱加工記録簿_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};

export const transcriptionReport: ReportDefinition = {
  key: "transcription",
  name: "書き起こし票",
  description: "盛付指示の書き起こし用ひな型を出力します（仮フォーマット）",
  category: "production",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "書き起こし対象を集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const header = ["喫食日", "施設名", "ユニット", "献立種類", "指示内容(仮)", "食数"];
    const rows = orders.map((order) => [
      dateKey(order.serviceDate),
      order.customer.name,
      order.unit.name,
      order.menuKind.name,
      `${order.menuKind.name}を盛付`,
      order.quantity,
    ]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "書き起こし票",
      header,
      rows,
      filenameBase: `書き起こし票_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};

export const allergenRelationReport: ReportDefinition = {
  key: "allergen_relation",
  name: "アレルギー連携表",
  description: "アレルギー注文と通常献立の連携一覧を出力します（仮フォーマット）",
  category: "production",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "アレルギー注文を集計中");
    const orders = await fetchAllergenOrdersForReport(resolved);

    const header = ["喫食日", "施設名", "ユニット", "アレルゲン", "食数", "連携先献立(仮)"];
    const rows = orders.map((order) => [
      dateKey(order.serviceDate),
      order.customer.name,
      order.unit.name,
      order.allergenType.name,
      order.quantity,
      "通常献立",
    ]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "アレルギー連携表",
      header,
      rows,
      filenameBase: `アレルギー連携表_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};
