import { randomUUID } from "node:crypto";
import { Worker, type Job } from "bullmq";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../../src/server.js";
import { closeRedisConnection, getRedisConnection } from "../../src/lib/redis.js";
import { closeReflectionQueue, REFLECTION_QUEUE_NAME } from "../../src/lib/reflection-queue.js";
import { runSmokeScenario } from "../../src/scripts/run-e2e-smoke.js";

type ReflectSessionInput = {
  rawSessionId: string;
  subscriberId: string;
  agentKind: string;
  agentId: string;
};

let activeWorker: Worker<ReflectSessionInput> | null = null;
let listeningServer: Awaited<ReturnType<typeof buildServer>> | null = null;

afterEach(async () => {
  if (activeWorker) {
    await activeWorker.close();
    activeWorker = null;
  }
  if (listeningServer) {
    await listeningServer.close();
    listeningServer = null;
  }
  await closeReflectionQueue();
  await closeRedisConnection();
  delete process.env.PLATON_INTERNAL_AUTH_TOKEN;
  delete process.env.PLATON_ALLOW_INTERNAL_AUTH_BYPASS;
});

describe("live e2e smoke", () => {
  const itLive = process.env.RUN_LIVE_E2E_SMOKE === "1" ? it : it.skip;

  itLive("stores a session, reflects it, writes graph memory, and retrieves it", async () => {
    const internalToken = `smoke-internal-${randomUUID()}`;
    process.env.PLATON_INTERNAL_AUTH_TOKEN = internalToken;
    process.env.PLATON_ALLOW_INTERNAL_AUTH_BYPASS = "1";

    const [{ reflectSession }, { getSession }] = await Promise.all([
      import(new URL("../../../worker/src/jobs/reflect-session.ts", import.meta.url).href),
      import(new URL("../../../worker/src/lib/neo4j.ts", import.meta.url).href)
    ]);

    activeWorker = new Worker<ReflectSessionInput>(
      REFLECTION_QUEUE_NAME,
      async (job: Job<ReflectSessionInput>) => {
        const session = getSession();
        try {
          await reflectSession(job.data, { session });
        } finally {
          await session.close();
        }
      },
      { connection: getRedisConnection() as never }
    );

    listeningServer = await buildServer();
    await listeningServer.listen({ port: 0, host: "127.0.0.1" });
    const address = listeningServer.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to resolve test server port");
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const result = await runSmokeScenario({
      baseUrl,
      internalAuthToken: internalToken
    });

    expect(result.reflectionStatus).toBe("completed");
    expect(result.retrieval.results.length).toBeGreaterThan(0);

  }, 120_000);
});
