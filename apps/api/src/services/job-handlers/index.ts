import type { Job } from "@dan1/database";
import { NotFoundError } from "../../lib/errors.js";
import { handleExportSpreadsheet } from "./export-spreadsheet.js";
import { handleImportProcurementFile } from "./import-procurement-file.js";
import { handleMealCountSync } from "./meal-count-sync.js";
import { handleInvoiceGeneratePdf } from "./invoice-generate-pdf.js";

import { handleReportGenerate } from "./report-generate.js";

export type JobHandlerContext = {
  setProgress: (progress: number, message?: string) => Promise<void>;
};

export type JobHandler = (job: Job, ctx: JobHandlerContext) => Promise<unknown>;

const handlers = new Map<string, JobHandler>([
  ["export.spreadsheet", handleExportSpreadsheet],
  ["import_procurement_file", handleImportProcurementFile],
  ["meal_count_sync", handleMealCountSync],
  ["invoice.generate_pdf", handleInvoiceGeneratePdf],
  ["report.generate", handleReportGenerate],
]);

export function getJobHandler(jobType: string): JobHandler | undefined {
  return handlers.get(jobType);
}

export function listRegisteredJobTypes(): string[] {
  return [...handlers.keys()];
}

export async function executeRegisteredJob(job: Job, ctx: JobHandlerContext): Promise<unknown> {
  const handler = getJobHandler(job.jobType);
  if (!handler) {
    throw new NotFoundError(`未登録のジョブタイプです: ${job.jobType}`);
  }
  return handler(job, ctx);
}
