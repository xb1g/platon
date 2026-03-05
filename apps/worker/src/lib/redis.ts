import { Redis } from 'ioredis';

export const redis: any = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});
