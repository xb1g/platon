import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { SessionPayload } from "@memory/shared";
import { pool } from "./postgres.js";

const initSql = readFileSync(new URL("./db/init.sql", import.meta.url), "utf8");

let ensureSessionTablePromise: Promise<void> | null = null;

export type RawSessionRow = {
  id: string;
  subscriber_id: string;
  agent_kind: string;
  agent_id: string;
  session_id: string;
  reflection_status: string | null;
};

type InsertRawSessionInput = {
  subscriberId: string;
  agentKind: string;
  agentId: string;
  sessionId: string;
  payload: SessionPayload;
};

export const ensureSessionTable = async () => {
  if (!ensureSessionTablePromise) {
    ensureSessionTablePromise = pool.query(initSql).then(() => undefined);
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

  const result = await pool.query<RawSessionRow>(
    `INSERT INTO raw_sessions (
      id,
      subscriber_id,
      agent_kind,
      agent_id,
      session_id,
      task_kind,
      task_summary,
      outcome_status,
      outcome_summary,
      input_context_summary,
      payload_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, subscriber_id, agent_kind, agent_id, session_id, reflection_status`,
    [
      randomUUID(),
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

export const markReflectionQueued = async (rawSessionId: string) => {
  await ensureSessionTable();
  await pool.query(
    `UPDATE raw_sessions
        SET reflection_status = $2,
            reflection_enqueued_at = NOW(),
            updated_at = NOW()
      WHERE id = $1`,
    [rawSessionId, "queued"]
  );
};

export const markReflectionFailed = async (rawSessionId: string, errorMessage: string) => {
  await ensureSessionTable();
  await pool.query(
    `UPDATE raw_sessions
        SET reflection_status = $2,
            reflection_error = $3,
            updated_at = NOW()
      WHERE id = $1`,
    [rawSessionId, "failed", errorMessage]
  );
};

export const getRawSessionById = async (rawSessionId: string) => {
  await ensureSessionTable();
  const result = await pool.query(
    `SELECT id,
            subscriber_id,
            agent_kind,
            agent_id,
            session_id,
            payload_json,
            reflection_status,
            reflection_enqueued_at,
            reflection_completed_at,
            reflection_error,
            created_at,
            updated_at
       FROM raw_sessions
      WHERE id = $1`,
    [rawSessionId]
  );

  return result.rows[0] ?? null;
};
