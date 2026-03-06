import { Worker, type Job } from 'bullmq';
import { redis } from './lib/redis.js';
import { getSession } from './lib/neo4j.js';
import { reflectSession, type ReflectSessionInput } from './jobs/reflect-session.js';
import { corneliusReflect, isCorneliusConfigured } from './lib/cornelius-reflect.js';

export const processReflectionJob = async (job: Job<ReflectSessionInput>) => {
  switch (job.name) {
    case 'reflect-session': {
      const session = getSession();

      try {
        await reflectSession(job.data, {
          session,
          ...(isCorneliusConfigured() ? { reflect: corneliusReflect } : {}),
        });
      } finally {
        try {
          await session.close();
        } catch (closeError) {
          console.warn(
            `Failed to close Neo4j session for job ${job.id}:`,
            closeError instanceof Error ? closeError.message : String(closeError)
          );
        }
      }

      return;
    }
    default:
      throw new Error(`Unknown reflection job: ${job.name}`);
  }
};

const worker = new Worker<ReflectSessionInput>('reflection-queue', processReflectionJob, {
  connection: redis,
});

worker.on('completed', job => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`${job?.id} (${job?.name}) has failed with ${err.message}`);
});
