import type { Job } from "@dan1/database";
import type { JobHandler } from "./index.js";
import { runExportSpreadsheet } from "../export.service.js";

export const handleExportSpreadsheet: JobHandler = async (job, { setProgress }) => {
  const params = (job.params ?? {}) as Record<string, unknown>;
  const exportType = String(params.exportType ?? "");
  const format = (params.format === "csv" ? "csv" : "xlsx") as "xlsx" | "csv";
  const query = (params.query ?? {}) as Record<string, unknown>;

  return runExportSpreadsheet(
    {
      exportType: exportType as "procurement_schedule" | "orders_csv",
      format,
      createdBy: job.createdBy ?? undefined,
      query,
    },
    setProgress,
  );
};
