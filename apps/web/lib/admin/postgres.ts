import pg from "pg";
import type { QueryResultRow } from "pg";
import { getPostgresConnectionString } from "./config";

const { Pool } = pg;

export type AdminOverviewCounts = {
  totalSessions: number;
  recentFailures: number;
  distinctAgents: number;
  latestSessionAt: string | null;
  retrievalFeedbackCount: number;
  vectorCount: number;
};

export type AdminSessionListFilters = {
  page: number;
  pageSize: number;
  subscriberId?: string;
  agentKind?: string;
  agentId?: string;
  sessionId?: string;
  outcomeStatus?: string;
  reflectionStatus?: string;
};

export type AdminSessionListRow = {
  id: string;
  subscriberId: string;
  agentKind: string;
  agentId: string;
  sessionId: string;
  taskKind: string;
  taskSummary: string;
  outcomeStatus: string;
  outcomeSummary: string;
  reflectionStatus: string;
  reflectionError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminSessionDetail = AdminSessionListRow & {
  subscriberId: string;
  inputContextSummary: string | null;
  payloadJson: unknown;
  reflectionEnqueuedAt: string | null;
  reflectionCompletedAt: string | null;
};

export type AdminFeedbackRow = {
  id: number;
  memoryId: string;
  verdict: string;
  queryText: string | null;
  createdAt: string;
};

export type AdminTableName = "raw_sessions" | "retrieval_feedback" | "memory_vectors";

export type AdminTableSnapshot = {
  name: AdminTableName;
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
};

type CountRow = QueryResultRow & {
  total_sessions: number | string;
  recent_failures: number | string;
  distinct_agents: number | string;
  latest_session_at: Date | string | null;
  retrieval_feedback_count: number | string;
  vector_count: number | string;
};

type RawSessionRow = QueryResultRow & {
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
  payload_json: unknown;
  reflection_status: string;
  reflection_enqueued_at: Date | string | null;
  reflection_completed_at: Date | string | null;
  reflection_error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type CountOnlyRow = QueryResultRow & {
  total: number | string;
};

type RetrievalFeedbackRow = QueryResultRow & {
  id: number | string;
  memory_id: string;
  verdict: string;
  query_text: string | null;
  created_at: Date | string;
};

let pool: pg.Pool | null = null;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: getPostgresConnectionString(),
    });
  }

  return pool;
};

const query = async <TRow extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
) => getPool().query<TRow>(text, values);

const toIsoString = (value: Date | string | null) =>
  value == null ? null : new Date(value).toISOString();

const mapSessionRow = (row: RawSessionRow): AdminSessionListRow => ({
  id: row.id,
  subscriberId: row.subscriber_id,
  agentKind: row.agent_kind,
  agentId: row.agent_id,
  sessionId: row.session_id,
  taskKind: row.task_kind,
  taskSummary: row.task_summary,
  outcomeStatus: row.outcome_status,
  outcomeSummary: row.outcome_summary,
  reflectionStatus: row.reflection_status,
  reflectionError: row.reflection_error,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const buildSessionWhereClause = (filters: AdminSessionListFilters) => {
  const clauses: string[] = [];
  const values: unknown[] = [];

  const push = (column: string, value: string | undefined) => {
    if (!value) {
      return;
    }

    values.push(value);
    clauses.push(`${column} = $${values.length}`);
  };

  push("subscriber_id", filters.subscriberId);
  push("agent_kind", filters.agentKind);
  push("agent_id", filters.agentId);
  push("session_id", filters.sessionId);
  push("outcome_status", filters.outcomeStatus);
  push("reflection_status", filters.reflectionStatus);

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const TABLE_CONFIG: Record<AdminTableName, { columns: string[] }> = {
  raw_sessions: {
    columns: [
      "id",
      "subscriber_id",
      "agent_kind",
      "agent_id",
      "session_id",
      "outcome_status",
      "reflection_status",
      "created_at",
    ],
  },
  retrieval_feedback: {
    columns: [
      "id",
      "subscriber_id",
      "agent_kind",
      "agent_id",
      "memory_id",
      "verdict",
      "created_at",
    ],
  },
  memory_vectors: {
    columns: [
      "memory_id",
      "namespace_id",
      "memory_type",
      "status",
      "created_at",
      "updated_at",
    ],
  },
};

export const getOverviewCounts = async (): Promise<AdminOverviewCounts> => {
  const result = await query<CountRow>(
    `
      WITH raw_session_counts AS (
        SELECT
          COUNT(*)::int AS total_sessions,
          COUNT(*) FILTER (WHERE outcome_status = 'failed')::int AS recent_failures,
          COUNT(DISTINCT agent_id)::int AS distinct_agents,
          MAX(created_at) AS latest_session_at
        FROM raw_sessions
      ),
      feedback_counts AS (
        SELECT COUNT(*)::int AS retrieval_feedback_count
        FROM retrieval_feedback
      ),
      vector_counts AS (
        SELECT COUNT(*)::int AS vector_count
        FROM memory_vectors
      )
      SELECT
        raw_session_counts.total_sessions,
        raw_session_counts.recent_failures,
        raw_session_counts.distinct_agents,
        raw_session_counts.latest_session_at,
        feedback_counts.retrieval_feedback_count,
        vector_counts.vector_count
      FROM raw_session_counts, feedback_counts, vector_counts
    `,
  );

  const row = result.rows[0];

  return {
    totalSessions: Number(row?.total_sessions ?? 0),
    recentFailures: Number(row?.recent_failures ?? 0),
    distinctAgents: Number(row?.distinct_agents ?? 0),
    latestSessionAt: toIsoString(row?.latest_session_at ?? null),
    retrievalFeedbackCount: Number(row?.retrieval_feedback_count ?? 0),
    vectorCount: Number(row?.vector_count ?? 0),
  };
};

export const listSessions = async (
  filters: AdminSessionListFilters,
): Promise<{ rows: AdminSessionListRow[]; total: number }> => {
  const { whereSql, values } = buildSessionWhereClause(filters);
  const limit = filters.pageSize;
  const offset = (filters.page - 1) * filters.pageSize;
  const countValues = [...values];
  const pageValues = [...values, limit, offset];

  const [rowsResult, countResult] = await Promise.all([
    query<RawSessionRow>(
      `
        SELECT *
        FROM raw_sessions
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      pageValues,
    ),
    query<CountOnlyRow>(
      `
        SELECT COUNT(*)::int AS total
        FROM raw_sessions
        ${whereSql}
      `,
      countValues,
    ),
  ]);

  return {
    rows: rowsResult.rows.map(mapSessionRow),
    total: Number(countResult.rows[0]?.total ?? 0),
  };
};

export const getSessionDetail = async (
  id: string,
): Promise<AdminSessionDetail | null> => {
  const result = await query<RawSessionRow>(
    `
      SELECT *
      FROM raw_sessions
      WHERE id = $1
    `,
    [id],
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const base = mapSessionRow(row);
  return {
    ...base,
    inputContextSummary: row.input_context_summary,
    payloadJson: row.payload_json,
    reflectionEnqueuedAt: toIsoString(row.reflection_enqueued_at),
    reflectionCompletedAt: toIsoString(row.reflection_completed_at),
  };
};

export const listFeedbackForNamespace = async (
  subscriberId: string,
  agentKind: string,
  agentId: string,
  limit = 20,
): Promise<AdminFeedbackRow[]> => {
  const result = await query<RetrievalFeedbackRow>(
    `
      SELECT id, memory_id, verdict, query_text, created_at
      FROM retrieval_feedback
      WHERE subscriber_id = $1
        AND agent_kind = $2
        AND agent_id = $3
      ORDER BY created_at DESC
      LIMIT $4
    `,
    [subscriberId, agentKind, agentId, limit],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    memoryId: row.memory_id,
    verdict: row.verdict,
    queryText: row.query_text,
    createdAt: new Date(row.created_at).toISOString(),
  }));
};

export const getTableSnapshot = async (
  tableName: AdminTableName,
  limit = 25,
): Promise<AdminTableSnapshot> => {
  const config = TABLE_CONFIG[tableName];
  const columns = config.columns.join(", ");
  const [rowsResult, countResult] = await Promise.all([
    query<QueryResultRow>(
      `
        SELECT ${columns}
        FROM ${tableName}
        ORDER BY 1 DESC
        LIMIT $1
      `,
      [limit],
    ),
    query<CountOnlyRow>(
      `
        SELECT COUNT(*)::int AS total
        FROM ${tableName}
      `,
    ),
  ]);

  return {
    name: tableName,
    rowCount: Number(countResult.rows[0]?.total ?? 0),
    columns: config.columns,
    rows: rowsResult.rows.map((row: QueryResultRow) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value instanceof Date ? value.toISOString() : value,
        ]),
      ),
    ),
  };
};

export const closeAdminPostgresPool = async () => {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
};
