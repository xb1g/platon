import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { retrievalResponseSchema, type RetrievalResponse, type SessionPayload } from "@memory/shared";
import { getRawSessionById } from "../lib/session-store.js";
import { pool } from "../lib/postgres.js";
import { waitForReflection, type ReflectionStatus } from "../lib/e2e/wait-for-reflection.js";

type SubmitSessionResult = {
  id: string;
};

type SmokeRetrieveRequest = {
  agentId: string;
  agentKind: string;
  query: string;
  limit: number;
  filters: {
    statuses: string[];
    toolNames: string[];
  };
};

export type SmokeScenarioDeps = {
  submitSession: (payload: SessionPayload) => Promise<SubmitSessionResult>;
  fetchReflectionStatus: (rawSessionId: string) => Promise<ReflectionStatus>;
  retrieveContext: (request: SmokeRetrieveRequest) => Promise<RetrievalResponse>;
};

export type RunSmokeScenarioOptions = {
  deps?: Partial<SmokeScenarioDeps>;
  baseUrl?: string;
  agentId?: string;
  agentKind?: string;
  query?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  paymentSignature?: string;
  internalAuthToken?: string;
};

export type SmokeScenarioResult = {
  rawSessionId: string;
  sessionId: string;
  reflectionStatus: ReflectionStatus;
  retrieval: RetrievalResponse;
};

const buildDefaultSessionPayload = (agentId: string, agentKind: string): SessionPayload => {
  const sessionId = `smoke-${randomUUID()}`;

  return {
    agentId,
    agentKind,
    sessionId,
    task: {
      kind: "smoke-test",
      summary: "Validate end-to-end memory ingestion and retrieval"
    },
    outcome: {
      status: "failed",
      summary: "Lookup failed before retrying cache refresh"
    },
    inputContextSummary: "Synthetic smoke test payload",
    events: [
      {
        type: "error",
        summary: "Downstream timeout while reading from cache"
      }
    ],
    tools: [
      {
        name: "cache-client",
        category: "storage"
      }
    ],
    errors: [
      {
        message: "Timeout reading from cache",
        code: "CACHE_TIMEOUT",
        retryable: true
      }
    ],
    artifacts: []
  };
};

const defaultSubmitSession = (
  baseUrl: string,
  paymentSignature: string,
  internalAuthToken?: string
) => async (payload: SessionPayload) => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "payment-signature": paymentSignature
  };
  if (internalAuthToken) {
    headers["x-platon-internal-auth"] = internalAuthToken;
  }

  const response = await fetch(`${baseUrl}/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to store session: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as SubmitSessionResult;

  if (!body?.id) {
    throw new Error("Session response missing raw session id");
  }

  return body;
};

const defaultFetchReflectionStatus = async (rawSessionId: string): Promise<ReflectionStatus> => {
  const rawSession = await getRawSessionById(rawSessionId);
  if (!rawSession) {
    throw new Error(`Raw session ${rawSessionId} was not found while polling reflection status`);
  }
  return rawSession.reflection_status;
};

const defaultRetrieveContext = (
  baseUrl: string,
  paymentSignature: string,
  internalAuthToken?: string
) => async (request: SmokeRetrieveRequest): Promise<RetrievalResponse> => {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "payment-signature": paymentSignature
  };
  if (internalAuthToken) {
    headers["x-platon-internal-auth"] = internalAuthToken;
  }

  const response = await fetch(`${baseUrl}/retrieve`, {
    method: "POST",
    headers,
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve context: ${response.status} ${await response.text()}`);
  }

  return retrievalResponseSchema.parse(await response.json());
};

export const runSmokeScenario = async (
  options: RunSmokeScenarioOptions = {}
): Promise<SmokeScenarioResult> => {
  const agentId = options.agentId ?? process.env.SMOKE_AGENT_ID ?? "agent-runtime";
  const agentKind = options.agentKind ?? process.env.SMOKE_AGENT_KIND ?? "support-agent";
  const query = options.query ?? "cache timeout retry";
  const baseUrl = options.baseUrl ?? process.env.SMOKE_API_BASE_URL ?? "http://127.0.0.1:3001";
  const paymentSignature = options.paymentSignature ?? process.env.SMOKE_PAYMENT_SIGNATURE ?? "token-123";
  const internalAuthToken =
    options.internalAuthToken ?? process.env.SMOKE_INTERNAL_AUTH_TOKEN;

  const submitSession =
    options.deps?.submitSession ?? defaultSubmitSession(baseUrl, paymentSignature, internalAuthToken);
  const fetchReflectionStatus =
    options.deps?.fetchReflectionStatus ?? defaultFetchReflectionStatus;
  const retrieveContext =
    options.deps?.retrieveContext ??
    defaultRetrieveContext(baseUrl, paymentSignature, internalAuthToken);

  const payload = buildDefaultSessionPayload(agentId, agentKind);
  const storedSession = await submitSession(payload);

  const reflectionStatus = await waitForReflection(
    () => fetchReflectionStatus(storedSession.id),
    {
      timeoutMs: options.timeoutMs,
      pollIntervalMs: options.pollIntervalMs
    }
  );

  if (reflectionStatus !== "completed") {
    throw new Error(`Smoke scenario failed: reflection ended with status ${reflectionStatus}`);
  }

  const retrieval = await retrieveContext({
    agentId,
    agentKind,
    query,
    limit: 5,
    filters: {
      statuses: [],
      toolNames: []
    }
  });

  return {
    rawSessionId: storedSession.id,
    sessionId: payload.sessionId,
    reflectionStatus,
    retrieval
  };
};

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  runSmokeScenario()
    .then(async (result) => {
      console.log(JSON.stringify(result, null, 2));
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      await pool.end();
      process.exit(1);
    });
}
