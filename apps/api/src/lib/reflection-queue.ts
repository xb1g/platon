import { Queue } from "bullmq";
import { getRedisConnection } from "./redis.js";

export const REFLECTION_QUEUE_NAME = "reflection-queue";
export const REFLECTION_JOB_NAME = "reflect-session";

export type ReflectionJob = {
  rawSessionId: string;
  subscriberId: string;
  agentKind: string;
  agentId: string;
};

let reflectionQueue: Queue<ReflectionJob> | null = null;

const getReflectionQueue = () => {
  if (!reflectionQueue) {
    reflectionQueue = new Queue(REFLECTION_QUEUE_NAME, {
      connection: getRedisConnection() as never
    }) as Queue<ReflectionJob>;
  }

  return reflectionQueue;
};

export const enqueueReflectionJob = async (job: ReflectionJob) => {
  const queue = getReflectionQueue();
  return queue.add(REFLECTION_JOB_NAME, job);
};

export const closeReflectionQueue = async () => {
  if (!reflectionQueue) {
    return;
  }

  await reflectionQueue.close();
  reflectionQueue = null;
};
