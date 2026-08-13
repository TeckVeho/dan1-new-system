import { getSchedules } from "../../procurement.service.js";
import { buildWorkbookBuffer, rowsToCsv, buildExportMetaRows } from "../../../lib/spreadsheet.js";
import { safeFilenamePart, parseDateParam } from "../helpers.js";
import {
  PROCUREMENT_SCHEDULE_PARAM_FIELDS,
  procurementScheduleReportParamsSchema,
} from "../params.js";
import type { ReportDefinition } from "../types.js";

export const procurementScheduleReport: ReportDefinition = {
  key: "procurement_schedule",
  name: "発注スケジュール",
  description: "業者別の発注スケジュールを Excel/CSV で出力します",
  category: "procurement",
  formats: ["xlsx", "csv"],
  permission: "procurement.schedule.read",
  specStatus: "confirmed",
  paramsSchema: procurementScheduleReportParamsSchema,
  paramFields: PROCUREMENT_SCHEDULE_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const input = procurementScheduleReportParamsSchema.parse(params);
    await setProgress(20, "発注スケジュールを集計中");

    const result = await getSchedules({
      supplierId: BigInt(input.supplierId),
      deliveryFrom: parseDateParam(input.deliveryFrom),
      deliveryTo: parseDateParam(input.deliveryTo),
      category: input.category,
      search: input.search,
      page: 1,
      pageSize: 10_000,
      shortageOnly: input.shortageOnly ?? false,
    });

    const dateHeaders = result.dates.map((d) => `${d.date}(${d.weekday})`);
    const header = ["商品名", "単位", "カテゴリ", ...dateHeaders, "合計"];
    const rows: (string | number)[][] = [];

    for (const item of result.items) {
      const cellsByDate = new Map(item.cells.map((c) => [c.deliveryDate, c]));
      const dateValues = result.dates.map((d) => {
        const cell = cellsByDate.get(d.date);
        return cell ? cell.orderQty : "";
      });
      rows.push([item.name, item.unit, item.category ?? "", ...dateValues, item.totalOrderQty]);
    }

    const safeSupplier = safeFilenamePart(result.supplier.name);
    const filenameBase = `発注スケジュール_${safeSupplier}_${input.deliveryFrom}_${input.deliveryTo}`;
    const format = input.format;
    const exportedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    const meta = {
      帳票名: "発注スケジュール",
      仕入業者: result.supplier.name,
      納品日: `${input.deliveryFrom} 〜 ${input.deliveryTo}`,
      商品検索: input.search ?? "",
      不足のみ: input.shortageOnly ?? false,
      出力日時: exportedAt,
    };
    const metaRows = buildExportMetaRows(meta);

    await setProgress(70, "ファイルを生成中");

    if (format === "csv") {
      const csv = rowsToCsv([...metaRows, header, ...rows]);
      return {
        buffer: Buffer.from(`\uFEFF${csv}`, "utf-8"),
        filename: `${filenameBase}.csv`,
        mimeType: "text/csv; charset=utf-8",
        rowCount: rows.length,
      };
    }

    const buffer = await buildWorkbookBuffer([
      { name: result.supplier.name, rows: [...metaRows, header, ...rows] },
    ]);
    return {
      buffer,
      filename: `${filenameBase}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      rowCount: rows.length,
    };
  },
};
