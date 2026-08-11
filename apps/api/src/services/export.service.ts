import { runReportBuild } from "./reports/report.service.js";
import { resolveLegacyExportType } from "./reports/registry.js";

export type ExportSpreadsheetParams = {
  exportType: "procurement_schedule" | "orders_csv";
  format: "xlsx" | "csv";
  createdBy?: bigint;
  query: Record<string, unknown>;
};

export async function runExportSpreadsheet(
  params: ExportSpreadsheetParams,
  setProgress: (progress: number, message?: string) => Promise<void>,
): Promise<{ fileId: string; filename: string; rowCount: number; format: string }> {
  const reportKey = resolveLegacyExportType(params.exportType);
  if (!reportKey) {
    throw new Error(`未対応の exportType です: ${params.exportType}`);
  }

  const result = await runReportBuild({
    reportKey,
    params: { ...params.query, format: params.format },
    createdBy: params.createdBy,
    setProgress,
  });

  return {
    fileId: result.fileId,
    filename: result.filename,
    rowCount: result.rowCount,
    format: params.format,
  };
}

export { saveGeneratedFile } from "./generated-file.service.js";
