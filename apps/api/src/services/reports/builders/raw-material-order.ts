import { prisma } from "@dan1/database";
import { rawMaterialOrderReportParamsSchema } from "../params.js";
import { dateKey, parseDateParam, safeFilenamePart, toSpreadsheetFile } from "../helpers.js";
import type { ReportDefinition, ReportParamField } from "../types.js";

const PARAM_FIELDS: ReportParamField[] = [
  { key: "serviceDateFrom", label: "喫食日（開始）", type: "date", required: true },
  { key: "serviceDateTo", label: "喫食日（終了）", type: "date", required: true },
  { key: "supplierId", label: "仕入業者ID", type: "string", placeholder: "未指定＝全業者" },
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

/** 原体の注文表（仮フォーマット） */
export const rawMaterialOrderReport: ReportDefinition = {
  key: "raw_material_order",
  name: "原体の注文表",
  description: "喫食日と原体商品ごとの発注量一覧（仮フォーマット）",
  category: "procurement",
  formats: ["xlsx", "csv"],
  permission: "procurement.schedule.read",
  specStatus: "provisional",
  paramsSchema: rawMaterialOrderReportParamsSchema,
  paramFields: PARAM_FIELDS,
  async build({ params, setProgress }) {
    const input = rawMaterialOrderReportParamsSchema.parse(params);
    const serviceDateFrom = parseDateParam(input.serviceDateFrom);
    const serviceDateTo = parseDateParam(input.serviceDateTo);

    await setProgress(25, "原体商品を取得中");
    const rawItems = await prisma.stockItem.findMany({
      where: {
        isRawMaterial: true,
        isActive: true,
        deletedAt: null,
        ...(input.supplierId ? { supplierId: BigInt(input.supplierId) } : {}),
      },
      include: { supplier: { select: { name: true, code: true } } },
      orderBy: [{ supplier: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });

    const schedules = await prisma.orderSchedule.findMany({
      where: {
        stockItemId: { in: rawItems.map((i) => i.id) },
        deliveryDate: { gte: serviceDateFrom, lte: serviceDateTo },
      },
      orderBy: [{ deliveryDate: "asc" }],
    });

    const header = ["納品日", "仕入業者", "商品コード", "商品名", "単位", "発注量", "在庫量"];
    const rows = schedules.map((schedule) => {
      const item = rawItems.find((i) => i.id === schedule.stockItemId);
      return [
        dateKey(schedule.deliveryDate),
        item?.supplier.name ?? "",
        item?.itemCode ?? "",
        item?.name ?? "",
        item?.unit ?? "",
        schedule.orderQuantity.toString(),
        schedule.stockQuantity?.toString() ?? "",
      ];
    });

    await setProgress(85, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "原体注文表",
      header,
      rows,
      filenameBase: `原体注文表_${safeFilenamePart(`${input.serviceDateFrom}_${input.serviceDateTo}`)}`,
      format: input.format,
    });
  },
};
