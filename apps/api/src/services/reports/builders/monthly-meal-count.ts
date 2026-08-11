import { monthlyMealCountReportParamsSchema, productionReportParamsSchema } from "../params.js";
import {
  dateKey,
  fetchMealOrdersForReport,
  parseDateParam,
  safeFilenamePart,
  toSpreadsheetFile,
} from "../helpers.js";
import type { ReportDefinition } from "../types.js";
import { PRODUCTION_PARAM_FIELDS } from "../params.js";
import { prisma } from "@dan1/database";

function resolveRangeParams(params: Record<string, unknown>) {
  const input = productionReportParamsSchema.parse(params);
  return {
    serviceDateFrom: parseDateParam(input.serviceDateFrom),
    serviceDateTo: parseDateParam(input.serviceDateTo),
    customerId: input.customerId ? BigInt(input.customerId) : undefined,
    format: input.format,
    rangeLabel: `${input.serviceDateFrom}_${input.serviceDateTo}`,
  };
}

/** 月間食数登録用の食数出力（契約開始・解約を反映） */
export const monthlyMealCountReport: ReportDefinition = {
  key: "monthly_meal_count",
  name: "月間食数登録用の食数出力",
  description: "食種別に1週間分を出力します。契約の開始・解約も反映（仮フォーマット）",
  category: "order",
  formats: ["xlsx", "csv"],
  permission: "report.generate",
  specStatus: "provisional",
  paramsSchema: monthlyMealCountReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveRangeParams(params);
    await setProgress(20, "契約中の施設を取得中");

    const activeCustomers = await prisma.customer.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        contractStartDate: { lte: resolved.serviceDateTo },
        OR: [{ contractEndDate: null }, { contractEndDate: { gte: resolved.serviceDateFrom } }],
        ...(resolved.customerId ? { id: resolved.customerId } : {}),
      },
      select: {
        id: true,
        customerCode: true,
        name: true,
        contractStartDate: true,
        contractEndDate: true,
      },
      orderBy: { customerCode: "asc" },
    });

    await setProgress(45, "食数を集計中");
    const orders = await fetchMealOrdersForReport(resolved);
    const activeIds = new Set(activeCustomers.map((c) => c.id.toString()));

    const header = [
      "喫食日",
      "施設コード",
      "施設名",
      "契約開始",
      "契約終了",
      "ユニット",
      "食事区分",
      "献立種類",
      "食数",
    ];
    const rows = orders
      .filter((order) => activeIds.has(order.customerId.toString()))
      .map((order) => {
        const customer = activeCustomers.find((c) => c.id === order.customerId);
        return [
          dateKey(order.serviceDate),
          order.customer.customerCode,
          order.customer.name,
          customer ? dateKey(customer.contractStartDate) : "",
          customer?.contractEndDate ? dateKey(customer.contractEndDate) : "",
          order.unit.name,
          order.mealType.name,
          order.menuKind.name,
          order.quantity,
        ];
      });

    await setProgress(85, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "月間食数",
      header,
      rows,
      filenameBase: `月間食数_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
      columnWidths: [12, 12, 24, 12, 12, 12, 12, 16, 8],
    });
  },
};
