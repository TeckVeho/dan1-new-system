import { prisma } from "@dan1/database";
import { mealCountSyncReportParamsSchema, MEAL_COUNT_SYNC_PARAM_FIELDS } from "../params.js";
import { dateKey, parseDateParam, safeFilenamePart, toSpreadsheetFile } from "../helpers.js";
import type { ReportDefinition } from "../types.js";

/** 発注側へ同期した食数の内訳（FR-702 の取込対象データ） */
export const mealCountSyncReport: ReportDefinition = {
  key: "meal_count_sync",
  name: "食数同期データ",
  description: "発注側へ反映した食数を施設・喫食日別に出力します",
  category: "procurement",
  formats: ["csv", "xlsx"],
  permission: "procurement.recalculate",
  specStatus: "confirmed",
  paramsSchema: mealCountSyncReportParamsSchema,
  paramFields: MEAL_COUNT_SYNC_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const input = mealCountSyncReportParamsSchema.parse(params);
    const dateFrom = parseDateParam(input.dateFrom);
    const dateTo = parseDateParam(input.dateTo);

    await setProgress(25, "食数を集計中");

    const grouped = await prisma.mealOrder.groupBy({
      by: ["customerId", "serviceDate"],
      where: {
        serviceDate: { gte: dateFrom, lte: dateTo },
        status: { in: ["provisional", "confirmed"] },
      },
      _sum: { quantity: true },
    });

    const customers = await prisma.customer.findMany({
      where: { id: { in: [...new Set(grouped.map((g) => g.customerId))] } },
      select: { id: true, customerCode: true, name: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id.toString(), c]));

    await setProgress(60, "参照実績を突合中");

    const references = await prisma.orderScheduleReference.findMany({
      where: { referenceDate: { gte: dateFrom, lte: dateTo } },
      select: { customerId: true, referenceDate: true, fallbackUsed: true },
    });
    const referenceKeys = new Map<string, boolean>();
    for (const ref of references) {
      referenceKeys.set(`${ref.customerId}:${dateKey(ref.referenceDate)}`, ref.fallbackUsed);
    }

    const header = ["喫食日", "施設コード", "施設名", "食数", "発注反映", "直近参照"];
    const rows = grouped
      .map((row) => {
        const customer = customerMap.get(row.customerId.toString());
        const key = `${row.customerId}:${dateKey(row.serviceDate)}`;
        const reflected = referenceKeys.has(key);
        return {
          serviceDate: dateKey(row.serviceDate),
          customerCode: customer?.customerCode ?? "—",
          customerName: customer?.name ?? "—",
          quantity: row._sum.quantity ?? 0,
          reflected: reflected ? "済" : "未",
          fallback: referenceKeys.get(key) ? "あり" : "なし",
        };
      })
      .sort(
        (a, b) =>
          a.serviceDate.localeCompare(b.serviceDate) || a.customerCode.localeCompare(b.customerCode),
      )
      .map((row) => [
        row.serviceDate,
        row.customerCode,
        row.customerName,
        row.quantity,
        row.reflected,
        row.fallback,
      ]);

    await setProgress(85, "ファイルを生成中");
    return toSpreadsheetFile({
      sheetName: "食数同期データ",
      header,
      rows,
      filenameBase: `食数同期_${safeFilenamePart(`${input.dateFrom}_${input.dateTo}`)}`,
      format: input.format,
    });
  },
};
