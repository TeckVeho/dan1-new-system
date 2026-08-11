import { salesPriceReportParamsSchema } from "../params.js";
import type { ReportDefinition, ReportParamField } from "../types.js";
import { generateSalesPriceSpreadsheet } from "../../selling-price.service.js";

const PARAM_FIELDS: ReportParamField[] = [
  { key: "invoiceMonth", label: "対象月", type: "string", required: true, placeholder: "2026-08" },
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

/** 売価計算出力 */
export const salesPriceReport: ReportDefinition = {
  key: "sales_price",
  name: "売価計算",
  description: "対象月の確定注文から売価データを計算・出力します（仮フォーマット）",
  category: "billing",
  formats: ["xlsx", "csv"],
  permission: "sales_price.generate",
  specStatus: "provisional",
  paramsSchema: salesPriceReportParamsSchema,
  paramFields: PARAM_FIELDS,
  async build({ params, setProgress }) {
    const input = salesPriceReportParamsSchema.parse(params);
    await setProgress(40, "売価を計算中");
    return generateSalesPriceSpreadsheet({
      invoiceMonth: input.invoiceMonth,
      customerIds: input.customerIds?.map((id) => BigInt(id)),
      format: input.format,
    });
  },
};
