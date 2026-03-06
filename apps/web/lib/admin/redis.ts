import { Queue } from "bullmq";
import { getRedisUrl } from "./config";

export const ADMIN_REFLECTION_QUEUE_NAME = "reflection-queue";

export type AdminRecentJob = {
  id: string;
  name: string;
  state: string;
  timestamp: number;
  finishedOn: number | null;
  failedReason: string | null;
  data: unknown;
};

export type AdminQueueSummary = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  recentJobs: AdminRecentJob[];
};

let queue: Queue | null = null;

const getRedisConnectionOptions = () => {
  const url = new URL(getRedisUrl());

  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
};

const getQueue = () => {
  if (!queue) {
    queue = new Queue(ADMIN_REFLECTION_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
    });
  }

  return queue;
};

export const getQueueSummary = async (): Promise<AdminQueueSummary> => {
  const reflectionQueue = getQueue();
  const [counts, jobs] = await Promise.all([
    reflectionQueue.getJobCounts("waiting", "active", "completed", "failed"),
    reflectionQueue.getJobs(
      ["waiting", "active", "completed", "failed"],
      0,
      9,
      true,
    ),
  ]);

  const recentJobs = await Promise.all(
    jobs.map(async (job) => ({
      id: String(job.id),
      name: job.name,
      state: await job.getState(),
      timestamp: job.timestamp,
      finishedOn: job.finishedOn ?? null,
      failedReason: job.failedReason ?? null,
      data: job.data,
    })),
  );

  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    recentJobs,
  };
};

export const closeAdminRedis = async () => {
  if (queue) {
    await queue.close();
    queue = null;
  }
};
