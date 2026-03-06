import { existsSync, readFileSync } from "node:fs";
import type { SessionPayload } from "@memory/shared";
import type { QueryResultRow } from "pg";
import { query } from "./postgres.js";

type ReflectionStatus = "queued" | "processing" | "completed" | "failed" | "pending_retry";

export type RawSessionRow = QueryResultRow & {
  id: string;
  subscriber_id: string;
  agent_kind: string;
  agent_id: string;
  session_id: string;
  task_kind: string;
  task_summary: string;
  outcome_status: string;
  outcome_summary: string;
  input_context_summary: string | null;
  payload_json: SessionPayload;
  reflection_status: ReflectionStatus;
  reflection_enqueued_at: Date | null;
  reflection_completed_at: Date | null;
  reflection_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type InsertRawSessionInput = {
  subscriberId: string;
  agentKind: string;
  agentId: string;
  sessionId: string;
  payload: SessionPayload;
};

const initSqlCandidates = [
  new URL("./db/init.sql", import.meta.url),
  new URL("../../../src/lib/db/init.sql", import.meta.url)
];

const initSql = (() => {
  for (const candidate of initSqlCandidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf8");
    }
  }

  throw new Error("Could not locate raw session init.sql");
})();

let ensureSessionTablePromise: Promise<void> | null = null;

export const ensureSessionTable = async (): Promise<void> => {
  if (!ensureSessionTablePromise) {
    ensureSessionTablePromise = query(initSql)
      .then(() => undefined)
      .catch((error) => {
        ensureSessionTablePromise = null;
        throw error;
      });
  }

  return ensureSessionTablePromise;
};

export const insertRawSession = async ({
  subscriberId,
  agentKind,
  agentId,
  sessionId,
  payload
}: InsertRawSessionInput): Promise<RawSessionRow> => {
  await ensureSessionTable();

  const result = await query<RawSessionRow>(
    `
      INSERT INTO raw_sessions (
        subscriber_id,
        agent_kind,
        agent_id,
        session_id,
        task_kind,
        task_summary,
        outcome_status,
        outcome_summary,
        input_context_summary,
        payload_json,
        reflection_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'queued')
      ON CONFLICT (subscriber_id, agent_kind, agent_id, session_id)
      DO UPDATE SET
        task_kind = EXCLUDED.task_kind,
        task_summary = EXCLUDED.task_summary,
        outcome_status = EXCLUDED.outcome_status,
        outcome_summary = EXCLUDED.outcome_summary,
        input_context_summary = EXCLUDED.input_context_summary,
        payload_json = EXCLUDED.payload_json,
        reflection_status = 'queued',
        reflection_enqueued_at = NULL,
        reflection_completed_at = NULL,
        reflection_error = NULL,
        updated_at = NOW()
      RETURNING *
    `,
    [
      subscriberId,
      agentKind,
      agentId,
      sessionId,
      payload.task.kind,
      payload.task.summary,
      payload.outcome.status,
      payload.outcome.summary,
      payload.inputContextSummary ?? null,
      JSON.stringify(payload)
    ]
  );

  return result.rows[0]!;
};

export const markReflectionQueued = async (id: string): Promise<void> => {
  await ensureSessionTable();
  await query(
    `
      UPDATE raw_sessions
      SET reflection_status = 'queued',
          reflection_enqueued_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    [id]
  );
};

export const markReflectionFailed = async (id: string, error: string): Promise<void> => {
  await ensureSessionTable();
  await query(
    `
      UPDATE raw_sessions
      SET reflection_status = 'failed',
          reflection_error = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, error]
  );
};

export const getRawSessionById = async (id: string): Promise<RawSessionRow | null> => {
  await ensureSessionTable();

  const result = await query<RawSessionRow>(
    `
      SELECT *
      FROM raw_sessions
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
};
