import { prisma } from "@dan1/database";
import type { Job } from "@dan1/database";
import { JobAlreadyRunningError, NotFoundError } from "../lib/errors.js";

export type JobRunner = (
  job: Job,
  helpers: { setProgress: (progress: number, message?: string) => Promise<void> },
) => Promise<unknown>;

export type CreateJobInput = {
  jobType: string;
  params?: Record<string, unknown>;
  createdBy?: bigint;
  paramsHash?: string;
  run: JobRunner;
};

/**
 * FR-002. Runs jobs inline (synchronously, in-process) rather than via a
 * queue, matching the local-dev `JOB_RUNNER=inline` mode. The 202-style
 * response shape from docs/08_api_spec.md §1.7 is preserved so the API
 * contract does not change when a real queue is introduced later.
 */
export async function createAndRunJob(input: CreateJobInput): Promise<Job> {
  if (input.paramsHash) {
    const candidates = await prisma.job.findMany({
      where: { jobType: input.jobType, status: { in: ["pending", "running"] } },
    });
    const running = candidates.find(
      (c) => c.params && typeof c.params === "object" && (c.params as Record<string, unknown>).__paramsHash === input.paramsHash,
    );
    if (running) throw new JobAlreadyRunningError();
  }

  const params: Record<string, unknown> | undefined = input.paramsHash
    ? { ...input.params, __paramsHash: input.paramsHash }
    : input.params;

  const job = await prisma.job.create({
    data: {
      jobType: input.jobType,
      status: "pending",
      params: params as never,
      createdBy: input.createdBy ?? null,
    },
  });

  const running = await prisma.job.update({
    where: { id: job.id },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const setProgress = async (progress: number, message?: string) => {
      await prisma.job.update({ where: { id: job.id }, data: { progress } });
      if (message) {
        await prisma.jobLog.create({ data: { jobId: job.id, level: "info", message } });
      }
    };
    const result = await input.run(running, { setProgress });
    return await prisma.job.update({
      where: { id: job.id },
      data: { status: "completed", progress: 100, result: (result ?? null) as never, completedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await prisma.jobLog.create({ data: { jobId: job.id, level: "error", message } });
    return prisma.job.update({
      where: { id: job.id },
      data: { status: "failed", error: message, completedAt: new Date() },
    });
  }
}

export async function getJob(id: bigint) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } }, logs: { orderBy: { createdAt: "asc" } } },
  });
  if (!job) throw new NotFoundError("ジョブが見つかりません");
  return job;
}

export type ListJobsQuery = { status?: string; jobType?: string; page: number; perPage: number };

export async function listJobs(query: ListJobsQuery) {
  const where = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.jobType ? { jobType: query.jobType } : {}),
  };
  const [items, totalCount] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.job.count({ where }),
  ]);
  return { items, totalCount };
}

export async function cancelJob(id: bigint) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new NotFoundError("ジョブが見つかりません");
  if (job.status !== "pending" && job.status !== "running") {
    return job;
  }
  return prisma.job.update({ where: { id }, data: { status: "cancelled", completedAt: new Date() } });
}
