import { prisma } from "@dan1/database";
import { bagDesignReportParamsSchema } from "../params.js";
import { safeFilenamePart, toSpreadsheetFile } from "../helpers.js";
import type { ReportDefinition, ReportParamField } from "../types.js";

const PARAM_FIELDS: ReportParamField[] = [
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

/** 袋の集約設計図（仮フォーマット） */
export const bagDesignReport: ReportDefinition = {
  key: "bag_design",
  name: "袋の集約設計図",
  description: "施設の袋設計とユニット割当を一覧します（仮フォーマット）",
  category: "delivery",
  formats: ["xlsx", "csv"],
  permission: "shipping.generate",
  specStatus: "provisional",
  paramsSchema: bagDesignReportParamsSchema,
  paramFields: PARAM_FIELDS,
  async build({ params, setProgress }) {
    const input = bagDesignReportParamsSchema.parse(params);
    await setProgress(30, "袋設計を取得中");

    const designs = await prisma.bagDesign.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(input.customerId ? { customerId: BigInt(input.customerId) } : {}),
      },
      include: {
        customer: { select: { customerCode: true, name: true } },
        units: { include: { unit: { select: { name: true, unitCode: true } } } },
      },
      orderBy: [{ customer: { customerCode: "asc" } }, { sortOrder: "asc" }],
    });

    const header = [
      "施設コード",
      "施設名",
      "袋名",
      "施設番号",
      "最大ユニット",
      "最大食数",
      "ユニットコード",
      "ユニット名",
    ];
    const rows = designs.flatMap((design) =>
      design.units.length > 0
        ? design.units.map((u) => [
            design.customer.customerCode,
            design.customer.name,
            design.name,
            design.facilityNumber ?? "",
            design.maxUnits,
            design.maxMeals,
            u.unit.unitCode,
            u.unit.name,
          ])
        : [[
            design.customer.customerCode,
            design.customer.name,
            design.name,
            design.facilityNumber ?? "",
            design.maxUnits,
            design.maxMeals,
            "",
            "",
          ]],
    );

    await setProgress(85, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "袋設計図",
      header,
      rows,
      filenameBase: `袋設計図_${safeFilenamePart(input.customerId ?? "all")}`,
      format: input.format,
      columnWidths: [12, 20, 16, 10, 12, 10, 12, 16],
    });
  },
};
