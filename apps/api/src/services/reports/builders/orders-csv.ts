import { exportOrdersCsv } from "../../orders.service.js";
import { ordersCsvReportParamsSchema } from "../params.js";
import type { ReportDefinition } from "../types.js";
import { ORDERS_CSV_PARAM_FIELDS } from "../params.js";

export const ordersCsvReport: ReportDefinition = {
  key: "orders_csv",
  name: "注文 CSV",
  description: "注文一覧を CSV で出力します",
  category: "order",
  formats: ["csv"],
  permission: "order.export",
  specStatus: "confirmed",
  paramsSchema: ordersCsvReportParamsSchema,
  paramFields: ORDERS_CSV_PARAM_FIELDS,
  async build({ params, setProgress }) {
    const input = ordersCsvReportParamsSchema.parse(params);
    await setProgress(30, "注文データを集計中");

    const csv = await exportOrdersCsv({
      customerId: input.customerId ? BigInt(input.customerId) : undefined,
      search: input.search,
      serviceDateFrom: input.serviceDateFrom ? new Date(`${input.serviceDateFrom}T00:00:00.000Z`) : undefined,
      serviceDateTo: input.serviceDateTo ? new Date(`${input.serviceDateTo}T00:00:00.000Z`) : undefined,
      unitId: input.unitId ? BigInt(input.unitId) : undefined,
      mealTypeId: input.mealTypeId ? BigInt(input.mealTypeId) : undefined,
      menuKindId: input.menuKindId ? BigInt(input.menuKindId) : undefined,
      status: input.status,
    });

    const from = input.serviceDateFrom ?? "all";
    const to = input.serviceDateTo ?? "all";

    await setProgress(80, "ファイルを生成中");

    return {
      buffer: Buffer.from(`\uFEFF${csv}`, "utf-8"),
      filename: `orders_${from}_${to}.csv`,
      mimeType: "text/csv; charset=utf-8",
      rowCount: Math.max(0, csv.split("\n").length - 1),
    };
  },
};
