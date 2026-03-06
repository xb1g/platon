import { Redis } from "ioredis";

let redisConnection: Redis | null = null;

export const getRedisConnection = () => {
  if (!redisConnection) {
    redisConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null
    });
  }

  return redisConnection;
};

export const closeRedisConnection = async () => {
  if (!redisConnection) {
    return;
  }

  await redisConnection.quit();
  redisConnection = null;
};
