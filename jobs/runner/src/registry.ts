import type { JobHandler } from "./types.js";

const handlers = new Map<string, JobHandler>();

export function registerJob(jobType: string, handler: JobHandler): void {
  if (handlers.has(jobType)) {
    throw new Error(`ジョブタイプ "${jobType}" は既に登録されています`);
  }
  handlers.set(jobType, handler);
}

export function getJob(jobType: string): JobHandler | undefined {
  return handlers.get(jobType);
}

export function listJobTypes(): string[] {
  return [...handlers.keys()];
}
