import { prisma } from "@dan1/database";
import {
  pouchSealReportParamsSchema,
  p7PrintCsvReportParamsSchema,
  productionReportParamsSchema,
} from "../params.js";
import { dateKey, fetchMealOrdersForReport, parseDateParam, safeFilenamePart, toSpreadsheetFile } from "../helpers.js";
import type { ReportDefinition } from "../types.js";
import { PRODUCTION_PARAM_FIELDS } from "../params.js";

function resolveRange(params: Record<string, unknown>) {
  const input = productionReportParamsSchema.parse(params);
  return {
    serviceDateFrom: parseDateParam(input.serviceDateFrom),
    serviceDateTo: parseDateParam(input.serviceDateTo),
    format: input.format,
    rangeLabel: `${input.serviceDateFrom}_${input.serviceDateTo}`,
  };
}

/** シール・パウチ出力（仮フォーマット） */
export const pouchSealReport: ReportDefinition = {
  key: "pouch_seal",
  name: "シール・パウチ出力",
  description: "施設・献立種類別のパウチ出力データ（仮フォーマット）",
  category: "delivery",
  formats: ["xlsx", "csv"],
  permission: "shipping.generate",
  specStatus: "provisional",
  paramsSchema: pouchSealReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const resolved = resolveRange(params);
    await setProgress(30, "食数を集計中");
    const orders = await fetchMealOrdersForReport(resolved);

    const header = ["喫食日", "施設コード", "施設名", "ユニット", "献立種類", "食数", "出力先"];
    const rows = orders.map((order) => [
      dateKey(order.serviceDate),
      order.customer.customerCode,
      order.customer.name,
      order.unit.name,
      order.menuKind.name,
      order.quantity,
      "パウチ",
    ]);

    await setProgress(85, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "パウチ出力",
      header,
      rows,
      filenameBase: `パウチ出力_${safeFilenamePart(resolved.rangeLabel)}`,
      format: resolved.format,
    });
  },
};

/** P7印刷用CSV（仮フォーマット） */
export const p7PrintCsvReport: ReportDefinition = {
  key: "p7_print_csv",
  name: "P7印刷用CSV",
  description: "P7プリンタ向けの印刷データ（仮フォーマット）",
  category: "delivery",
  formats: ["csv"],
  permission: "shipping.generate",
  specStatus: "provisional",
  paramsSchema: p7PrintCsvReportParamsSchema,
  paramFields: PRODUCTION_PARAM_FIELDS.map((f) =>
    f.key === "format" ? { ...f, options: [{ value: "csv", label: "CSV" }] } : f,
  ),
  async build({ params, setProgress }) {
    const input = p7PrintCsvReportParamsSchema.parse(params);
    const resolved = {
      serviceDateFrom: parseDateParam(input.serviceDateFrom),
      serviceDateTo: parseDateParam(input.serviceDateTo),
      rangeLabel: `${input.serviceDateFrom}_${input.serviceDateTo}`,
    };
    await setProgress(30, "袋データを集計中");

    const bagDesigns = await prisma.bagDesign.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        customer: { select: { customerCode: true, name: true } },
        units: { include: { unit: { select: { name: true } } } },
      },
      orderBy: [{ customer: { customerCode: "asc" } }, { sortOrder: "asc" }],
    });

    const header = ["施設コード", "施設名", "袋名", "施設番号", "ユニット", "最大食数", "最大ユニット数"];
    const rows = bagDesigns.flatMap((bag) =>
      bag.units.length > 0
        ? bag.units.map((u) => [
            bag.customer.customerCode,
            bag.customer.name,
            bag.name,
            bag.facilityNumber ?? "",
            u.unit.name,
            bag.maxMeals,
            bag.maxUnits,
          ])
        : [[bag.customer.customerCode, bag.customer.name, bag.name, bag.facilityNumber ?? "", "", bag.maxMeals, bag.maxUnits]],
    );

    await setProgress(85, "CSVを生成中");
    return toSpreadsheetFile({
      sheetName: "P7",
      header,
      rows,
      filenameBase: `P7印刷_${safeFilenamePart(resolved.rangeLabel)}`,
      format: "csv",
    });
  },
};
