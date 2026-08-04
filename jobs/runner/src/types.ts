export type JobPayload = Record<string, unknown>;

export type JobContext = {
  jobType: string;
  payload: JobPayload;
  /** Standard Cloud Run Jobs execution env vars. 0 when run locally. */
  taskIndex: number;
  taskAttempt: number;
  taskCount: number;
};

export type JobHandler = (context: JobContext) => Promise<void>;
