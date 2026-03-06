CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS raw_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id TEXT NOT NULL,
  agent_kind TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  task_kind TEXT NOT NULL,
  task_summary TEXT NOT NULL,
  outcome_status TEXT NOT NULL,
  outcome_summary TEXT NOT NULL,
  input_context_summary TEXT,
  payload_json JSONB NOT NULL,
  reflection_status TEXT NOT NULL DEFAULT 'queued',
  reflection_enqueued_at TIMESTAMPTZ,
  reflection_completed_at TIMESTAMPTZ,
  reflection_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT raw_sessions_namespace_session_key UNIQUE (
    subscriber_id,
    agent_kind,
    agent_id,
    session_id
  ),
  CONSTRAINT raw_sessions_reflection_status_check CHECK (
    reflection_status IN ('queued', 'processing', 'completed', 'failed', 'pending_retry')
  )
);

CREATE INDEX IF NOT EXISTS raw_sessions_reflection_status_idx
  ON raw_sessions (reflection_status);
