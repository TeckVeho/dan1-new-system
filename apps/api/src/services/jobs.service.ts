import { prisma } from "@dan1/database";
import type { Job } from "@dan1/database";
import { env } from "../config/env.js";
import { JobAlreadyRunningError, NotFoundError } from "../lib/errors.js";
import { executeRegisteredJob } from "./job-handlers/index.js";

export type JobRunner = (
  job: Job,
  helpers: { setProgress: (progress: number, message?: string) => Promise<void> },
) => Promise<unknown>;

export type CreateJobInput = {
  jobType: string;
  params?: Record<string, unknown>;
  createdBy?: bigint;
  paramsHash?: string;
  run?: JobRunner;
};

function buildParams(input: CreateJobInput): Record<string, unknown> | undefined {
  if (!input.paramsHash) return input.params;
  return { ...input.params, __paramsHash: input.paramsHash };
}

async function findRunningDuplicate(jobType: string, paramsHash?: string): Promise<Job | undefined> {
  if (!paramsHash) return undefined;
  const candidates = await prisma.job.findMany({
    where: { jobType, status: { in: ["pending", "running"] } },
  });
  return candidates.find(
    (c) =>
      c.params &&
      typeof c.params === "object" &&
      (c.params as Record<string, unknown>).__paramsHash === paramsHash,
  );
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const running = await findRunningDuplicate(input.jobType, input.paramsHash);
  if (running) throw new JobAlreadyRunningError();

  return prisma.job.create({
    data: {
      jobType: input.jobType,
      status: "pending",
      params: buildParams(input) as never,
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function runJob(jobId: bigint, run?: JobRunner): Promise<Job> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError("ジョブが見つかりません");
  if (job.status === "cancelled" || job.status === "completed" || job.status === "failed") {
    return job;
  }

  const running = await prisma.job.update({
    where: { id: jobId },
    data: { status: "running", startedAt: job.startedAt ?? new Date() },
  });

  const setProgress = async (progress: number, message?: string) => {
    await prisma.job.update({ where: { id: jobId }, data: { progress } });
    if (message) {
      await prisma.jobLog.create({ data: { jobId, level: "info", message } });
    }
  };

  try {
    const result = run
      ? await run(running, { setProgress })
      : await executeRegisteredJob(running, { setProgress });

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        result: (result ?? null) as never,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await prisma.jobLog.create({ data: { jobId, level: "error", message } });
    return prisma.job.update({
      where: { id: jobId },
      data: { status: "failed", error: message, completedAt: new Date() },
    });
  }
}

function enqueueExecution(jobId: bigint, run?: JobRunner): void {
  const execute = () => {
    runJob(jobId, run).catch((error) => {
      console.error(`ジョブ ${jobId} の実行に失敗しました`, error);
    });
  };

  if (env.jobRunner === "inline") {
    setImmediate(execute);
    return;
  }

  // queue モードでは Cloud Run Jobs が pending ジョブを取得して実行する想定
}

/**
 * FR-002. ジョブを登録し、非同期で実行する。
 * inline モードでは setImmediate で API レスポンス後に処理を開始する。
 */
export async function createAndRunJob(input: CreateJobInput): Promise<Job> {
  const job = await createJob(input);
  enqueueExecution(job.id, input.run);
  return job;
}

export async function executePendingJob(jobId: bigint): Promise<Job> {
  return runJob(jobId);
}

export async function getJob(id: bigint) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      logs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!job) throw new NotFoundError("ジョブが見つかりません");
  return job;
}

export type ListJobsQuery = {
  status?: string;
  jobType?: string;
  from?: string;
  to?: string;
  page: number;
  perPage: number;
};

export async function listJobs(query: ListJobsQuery) {
  const where = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.jobType ? { jobType: query.jobType } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return {
    items: items.map((job) => ({
      ...job,
      createdByName: job.user?.name ?? null,
    })),
    totalCount,
  };
}

export async function cancelJob(id: bigint) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new NotFoundError("ジョブが見つかりません");
  if (job.status !== "pending" && job.status !== "running") {
    return job;
  }
  return prisma.job.update({ where: { id }, data: { status: "cancelled", completedAt: new Date() } });
}
