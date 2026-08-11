import { prisma } from "@dan1/database";
import { pickingInstructionReportParamsSchema, productionReportParamsSchema } from "../params.js";
import { dateKey, parseDateParam, safeFilenamePart, toSpreadsheetFile } from "../helpers.js";
import type { ReportDefinition } from "../types.js";
import { PRODUCTION_PARAM_FIELDS } from "../params.js";

const DESTINATION_LABELS: Record<string, string> = {
  regular_menu: "通常献立",
  allergen_menu: "アレルギー献立",
  pouch: "パウチ",
  other: "その他",
};

function resolveRange(params: Record<string, unknown>) {
  const input = productionReportParamsSchema.parse(params);
  return {
    serviceDateFrom: parseDateParam(input.serviceDateFrom),
    serviceDateTo: parseDateParam(input.serviceDateTo),
    format: input.format,
    rangeLabel: `${input.serviceDateFrom}_${input.serviceDateTo}`,
  };
}

/** ピッキング指示書（仮フォーマット） */
export const pickingInstructionReport: ReportDefinition = {
  key: "picking_instruction",
  name: "ピッキング指示書",
  description: "商品ごとの出力先設定に基づくピッキング指示（仮フォーマット）",
  category: "delivery",
  formats: ["xlsx", "csv"],
  permission: "shipping.generate",
  specStatus: "provisional",
  paramsSchema: pickingInstructionReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveRange(params);
    await setProgress(25, "ピッキング設定を取得中");

    const rules = await prisma.pickingDestinationRule.findMany({
      where: { isActive: true },
      include: {
        stockItem: {
          include: { supplier: { select: { name: true } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const schedules = await prisma.orderSchedule.findMany({
      where: {
        stockItemId: { in: rules.map((r) => r.stockItemId) },
        deliveryDate: { gte: resolved.serviceDateFrom, lte: resolved.serviceDateTo },
      },
      include: { stockItem: true },
      orderBy: [{ deliveryDate: "asc" }],
    });

    const header = ["納品日", "仕入業者", "商品名", "発注量", "出力先", "備考"];
    const rows = schedules.map((schedule) => {
      const rule = rules.find((r) => r.stockItemId === schedule.stockItemId);
      return [
        dateKey(schedule.deliveryDate),
        rule?.stockItem.supplier.name ?? "",
        schedule.stockItem.name,
        schedule.orderQuantity.toString(),
        DESTINATION_LABELS[rule?.destination ?? "other"] ?? rule?.destination ?? "",
        rule?.note ?? "",
      ];
    });

    await setProgress(85, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "ピッキング指示",
      header,
      rows,
      filenameBase: `ピッキング指示_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};
