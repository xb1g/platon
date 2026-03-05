import { Worker } from 'bullmq';
import { redis } from './lib/redis.js';
import { reflectSession } from './jobs/reflect-session.js';

const worker = new Worker('reflection-queue', async job => {
  if (job.name === 'reflect-session') {
    await reflectSession(job.data);
  }
}, { connection: redis });

worker.on('completed', job => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
