import type { QueryResultRow } from 'pg';
import type { RetrievalUsefulness } from '@memory/shared';
import { query } from '../postgres.js';

export type RetrievalFeedbackVerdict = 'useful' | 'harmful';

export type RetrievalFeedbackScope = {
  subscriberId: string;
  agentKind: string;
  agentId: string;
};

export type RecordRetrievalFeedbackInput = RetrievalFeedbackScope & {
  memoryId: string;
  verdict: RetrievalFeedbackVerdict;
  query?: string;
};

type RetrievalFeedbackRow = QueryResultRow & {
  memory_id: string;
  useful_count: number | string;
  harmful_count: number | string;
};

const ensureFeedbackTableSql = `
  CREATE TABLE IF NOT EXISTS retrieval_feedback (
    id BIGSERIAL PRIMARY KEY,
    subscriber_id TEXT NOT NULL,
    agent_kind TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    memory_id TEXT NOT NULL,
    verdict TEXT NOT NULL CHECK (verdict IN ('useful', 'harmful')),
    query_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS retrieval_feedback_scope_idx
    ON retrieval_feedback (subscriber_id, agent_kind, agent_id, memory_id);
`;

let ensureFeedbackTablePromise: Promise<void> | null = null;

const ensureFeedbackTable = async (): Promise<void> => {
  if (!ensureFeedbackTablePromise) {
    ensureFeedbackTablePromise = query(ensureFeedbackTableSql)
      .then(() => undefined)
      .catch((error) => {
        ensureFeedbackTablePromise = null;
        throw error;
      });
  }

  return ensureFeedbackTablePromise;
};

const toUsefulness = (usefulCount: number, harmfulCount: number): RetrievalUsefulness => {
  const total = usefulCount + harmfulCount;

  return {
    usefulCount,
    harmfulCount,
    score: total === 0 ? 0 : Number(((usefulCount - harmfulCount) / total).toFixed(4)),
  };
};

export const getRetrievalFeedbackSummaries = async (
  input: RetrievalFeedbackScope & {
    memoryIds: string[];
  }
): Promise<Map<string, RetrievalUsefulness>> => {
  if (input.memoryIds.length === 0) {
    return new Map();
  }

  await ensureFeedbackTable();

  const result = await query<RetrievalFeedbackRow>(
    `
      SELECT
        memory_id,
        SUM(CASE WHEN verdict = 'useful' THEN 1 ELSE 0 END)::int AS useful_count,
        SUM(CASE WHEN verdict = 'harmful' THEN 1 ELSE 0 END)::int AS harmful_count
      FROM retrieval_feedback
      WHERE subscriber_id = $1
        AND agent_kind = $2
        AND agent_id = $3
        AND memory_id = ANY($4::text[])
      GROUP BY memory_id
    `,
    [input.subscriberId, input.agentKind, input.agentId, input.memoryIds]
  );

  return new Map(
    result.rows.map((row) => [
      row.memory_id,
      toUsefulness(Number(row.useful_count ?? 0), Number(row.harmful_count ?? 0)),
    ])
  );
};

export const recordRetrievalFeedback = async (
  input: RecordRetrievalFeedbackInput
): Promise<RetrievalUsefulness> => {
  await ensureFeedbackTable();

  await query(
    `
      INSERT INTO retrieval_feedback (
        subscriber_id,
        agent_kind,
        agent_id,
        memory_id,
        verdict,
        query_text
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      input.subscriberId,
      input.agentKind,
      input.agentId,
      input.memoryId,
      input.verdict,
      input.query ?? null,
    ]
  );

  const summaries = await getRetrievalFeedbackSummaries({
    subscriberId: input.subscriberId,
    agentKind: input.agentKind,
    agentId: input.agentId,
    memoryIds: [input.memoryId],
  });

  return (
    summaries.get(input.memoryId) ?? {
      usefulCount: 0,
      harmfulCount: 0,
      score: 0,
    }
  );
};
