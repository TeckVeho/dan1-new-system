import { productionReportParamsSchema } from "../params.js";
import {
  dateKey,
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

/** 製造へ渡す食数の確認用帳票（仮フォーマット） */
export const mealCountConfirmReport: ReportDefinition = {
  key: "meal_count_confirm",
  name: "注文食数確認表",
  description: "製造へ渡す食数を施設・ユニット別に確認します（仮フォーマット）",
  category: "order",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: productionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveProductionParams(params);
    await setProgress(25, "食数を集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const header = [
      "喫食日",
      "施設コード",
      "施設名",
      "ユニット",
      "食事区分",
      "献立種類",
      "注文区分",
      "食数",
      "ステータス",
    ];
    const rows = orders.map((order) => [
      dateKey(order.serviceDate),
      order.customer.customerCode,
      order.customer.name,
      order.unit.name,
      order.mealType.name,
      order.menuKind.name,
      order.orderType.name,
      order.quantity,
      order.status,
    ]);

    await setProgress(80, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "注文食数確認",
      header,
      rows,
      filenameBase: `注文食数確認_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};
