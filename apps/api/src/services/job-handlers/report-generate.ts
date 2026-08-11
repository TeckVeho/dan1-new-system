import type { Job } from "@dan1/database";
import type { JobHandler } from "./index.js";
import { runReportBuild } from "../reports/report.service.js";

export const handleReportGenerate: JobHandler = async (job, { setProgress }) => {
  const params = (job.params ?? {}) as Record<string, unknown>;
  const reportKey = String(params.reportKey ?? "");
  const reportParams = (params.params ?? {}) as Record<string, unknown>;

  await setProgress(5, "帳票生成を開始");

  return runReportBuild({
    reportKey,
    params: reportParams,
    createdBy: job.createdBy ?? undefined,
    setProgress,
  });
};
