import "./jobs/index.js";
import { getJob, listJobTypes } from "./registry.js";
import { logger } from "./logger.js";
import type { JobContext, JobPayload } from "./types.js";

function readPayload(): JobPayload {
  const raw = process.env.JOB_PAYLOAD;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as JobPayload;
  } catch (error) {
    logger.error("JOB_PAYLOAD の JSON 解析に失敗しました", { error: String(error) });
    return {};
  }
}

async function main(): Promise<void> {
  const jobType = process.env.JOB_TYPE;
  // Cloud Run Jobs が自動的に設定する実行時環境変数。
  const taskIndex = Number(process.env.CLOUD_RUN_TASK_INDEX ?? 0);
  const taskAttempt = Number(process.env.CLOUD_RUN_TASK_ATTEMPT ?? 0);
  const taskCount = Number(process.env.CLOUD_RUN_TASK_COUNT ?? 1);

  if (!jobType) {
    logger.error("JOB_TYPE が指定されていません", { availableJobTypes: listJobTypes() });
    process.exitCode = 1;
    return;
  }

  const handler = getJob(jobType);
  if (!handler) {
    logger.error(`未知の JOB_TYPE です: ${jobType}`, { availableJobTypes: listJobTypes() });
    process.exitCode = 1;
    return;
  }

  const context: JobContext = {
    jobType,
    payload: readPayload(),
    taskIndex,
    taskAttempt,
    taskCount,
  };

  logger.info(`ジョブを開始します: ${jobType}`, { taskIndex, taskAttempt, taskCount });
  const startedAt = Date.now();

  try {
    await handler(context);
    logger.info(`ジョブが完了しました: ${jobType}`, { durationMs: Date.now() - startedAt });
  } catch (error) {
    logger.error(`ジョブが失敗しました: ${jobType}`, {
      error: error instanceof Error ? error.message : String(error),
      taskAttempt,
    });
    // 非ゼロで終了すると、Cloud Run Jobs の max_retries に従って再実行される。
    process.exitCode = 1;
  }
}

main();
