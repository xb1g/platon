import { pool } from './postgres.js';

const TABLE = 'raw_sessions';

export type RawSessionLookup = {
  rawSessionId: string;
  subscriberId: string;
  agentKind: string;
  agentId: string;
};

export type StoredSessionPayload = {
  agentId: string;
  agentKind: string;
  tenantId?: string;
  sessionId: string;
  inputContextSummary?: string;
  task: { kind: string; summary: string };
  outcome: { status: string; summary: string };
  tools?: Array<{ name: string; category: string }>;
  events?: Array<{ type: string; summary: string }>;
  artifacts?: Array<{ kind: string; uri: string; summary?: string }>;
  errors?: Array<{ message: string; code?: string; retryable?: boolean }>;
  humanFeedback?: { rating: number; summary: string };
};

type QueryResultRow = {
  payload_json: unknown;
};

type SessionStoreDeps = {
  query?: (sql: string, params: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
};

const isStoredSessionPayload = (value: unknown): value is StoredSessionPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<StoredSessionPayload>;

  return (
    typeof payload.agentId === 'string' &&
    typeof payload.agentKind === 'string' &&
    typeof payload.sessionId === 'string' &&
    typeof payload.task?.kind === 'string' &&
    typeof payload.task?.summary === 'string' &&
    typeof payload.outcome?.status === 'string' &&
    typeof payload.outcome?.summary === 'string'
  );
};

export const getRawSessionById = async (
  lookup: RawSessionLookup,
  deps?: SessionStoreDeps
): Promise<StoredSessionPayload> => {
  const result = await (deps?.query ?? ((sql, params) => pool.query<QueryResultRow>(sql, params)))(
    `SELECT payload_json
       FROM ${TABLE}
      WHERE id = $1
        AND subscriber_id = $2
        AND agent_kind = $3
        AND agent_id = $4
      LIMIT 1`,
    [lookup.rawSessionId, lookup.subscriberId, lookup.agentKind, lookup.agentId]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error(
      `Raw session ${lookup.rawSessionId} not found for ${lookup.subscriberId}/${lookup.agentKind}/${lookup.agentId}`
    );
  }

  if (!isStoredSessionPayload(row.payload_json)) {
    throw new Error(`Raw session ${lookup.rawSessionId} payload is invalid`);
  }

  return {
    ...row.payload_json,
    tools: row.payload_json.tools ?? [],
    events: row.payload_json.events ?? [],
    artifacts: row.payload_json.artifacts ?? [],
    errors: row.payload_json.errors ?? [],
  };
};

export async function markReflectionProcessing(rawSessionId: string): Promise<void> {
  await pool.query(
    `UPDATE ${TABLE} SET reflection_status = 'processing', updated_at = NOW() WHERE id = $1`,
    [rawSessionId]
  );
}

export async function markReflectionCompleted(rawSessionId: string): Promise<void> {
  await pool.query(
    `UPDATE ${TABLE} SET reflection_status = 'completed', reflection_completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [rawSessionId]
  );
}

export async function markReflectionFailed(rawSessionId: string, error: string): Promise<void> {
  await pool.query(
    `UPDATE ${TABLE} SET reflection_status = 'failed', reflection_error = $2, updated_at = NOW() WHERE id = $1`,
    [rawSessionId, error]
  );
}

export const sessionStoreStatus = {
  markReflectionProcessing,
  markReflectionCompleted,
  markReflectionFailed,
};
