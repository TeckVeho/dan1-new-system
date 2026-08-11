import type { ReportDefinition } from "./types.js";
import { procurementScheduleReport } from "./builders/procurement-schedule.js";
import { ordersCsvReport } from "./builders/orders-csv.js";
import {
  mealCountSummaryReport,
  productionPlanReport,
  convertedCookingReport,
  measureSheetReport,
  heatingRecordReport,
  transcriptionReport,
  allergenRelationReport,
} from "./builders/production-reports.js";
import { mealCountConfirmReport } from "./builders/meal-count-confirm.js";
import { mealCountSyncReport } from "./builders/meal-count-sync.js";
import { monthlyMealCountReport } from "./builders/monthly-meal-count.js";
import { deliveryLabelReport } from "./builders/delivery-label.js";
import { pouchSealReport, p7PrintCsvReport } from "./builders/pouch-p7-reports.js";
import { rawMaterialOrderReport } from "./builders/raw-material-order.js";
import { pickingInstructionReport } from "./builders/picking-instruction.js";
import { bagDesignReport } from "./builders/bag-design-report.js";
import { salesPriceReport } from "./builders/sales-price-report.js";

const definitions: ReportDefinition[] = [
  procurementScheduleReport,
  ordersCsvReport,
  mealCountSyncReport,
  mealCountSummaryReport,
  mealCountConfirmReport,
  productionPlanReport,
  convertedCookingReport,
  measureSheetReport,
  heatingRecordReport,
  transcriptionReport,
  allergenRelationReport,
  monthlyMealCountReport,
  deliveryLabelReport,
  pouchSealReport,
  p7PrintCsvReport,
  rawMaterialOrderReport,
  pickingInstructionReport,
  bagDesignReport,
  salesPriceReport,
];

const registry = new Map<string, ReportDefinition>(definitions.map((def) => [def.key, def]));

export function listReportDefinitions(): ReportDefinition[] {
  return definitions;
}

export function getReportDefinition(key: string): ReportDefinition | undefined {
  return registry.get(key);
}

export function getReportDefinitionOrThrow(key: string): ReportDefinition {
  const def = registry.get(key);
  if (!def) throw new Error(`未登録の帳票です: ${key}`);
  return def;
}

/** export.spreadsheet ジョブとの後方互換 */
export function resolveLegacyExportType(exportType: string): string | undefined {
  if (exportType === "procurement_schedule" || exportType === "orders_csv") {
    return exportType;
  }
  return undefined;
}
