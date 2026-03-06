import {
  getGraphSummary as defaultGetGraphSummary,
  getLabelCounts as defaultGetLabelCounts,
  getRecentNodes as defaultGetRecentNodes,
  getRelationshipCounts as defaultGetRelationshipCounts,
  listSubscribers as defaultListSubscribers,
  getSubscriberGraph as defaultGetSubscriberGraph,
  type AdminGraphCountRow,
  type AdminGraphSummary,
  type AdminRecentNode,
  type AdminSubscriberSummary,
  type AdminSubscriberGraphData,
  type AdminSubscriberNamespace,
  type AdminSubscriberLearning,
} from "./neo4j";

import {
  getOverviewCounts as defaultGetOverviewCounts,
  getSessionDetail as defaultGetSessionDetail,
  getTableSnapshot as defaultGetTableSnapshot,
  listFeedbackForNamespace as defaultListFeedbackForNamespace,
  listSessions as defaultListSessions,
  type AdminFeedbackRow,
  type AdminOverviewCounts,
  type AdminSessionDetail,
  type AdminSessionListFilters,
  type AdminSessionListRow,
  type AdminTableSnapshot,
} from "./postgres";
import {
  getQueueSummary as defaultGetQueueSummary,
  type AdminQueueSummary,
} from "./redis";

export type { AdminSubscriberSummary, AdminSubscriberGraphData, AdminSubscriberNamespace, AdminSubscriberLearning };

type AdminDeps = {
  postgres?: {
    getOverviewCounts?: () => Promise<AdminOverviewCounts>;
    listSessions?: (
      filters: AdminSessionListFilters,
    ) => Promise<{ rows: AdminSessionListRow[]; total: number }>;
    getSessionDetail?: (id: string) => Promise<AdminSessionDetail | null>;
    listFeedbackForNamespace?: (
      subscriberId: string,
      agentKind: string,
      agentId: string,
      limit?: number,
    ) => Promise<AdminFeedbackRow[]>;
    getTableSnapshot?: (
      tableName: "raw_sessions" | "retrieval_feedback" | "memory_vectors",
      limit?: number,
    ) => Promise<AdminTableSnapshot>;
  };
  neo4j?: {
    getGraphSummary?: () => Promise<AdminGraphSummary>;
    getLabelCounts?: () => Promise<AdminGraphCountRow[]>;
    getRelationshipCounts?: () => Promise<AdminGraphCountRow[]>;
    getRecentNodes?: (limit?: number) => Promise<AdminRecentNode[]>;
    listSubscribers?: () => Promise<AdminSubscriberSummary[]>;
    getSubscriberGraph?: (subscriberId: string) => Promise<AdminSubscriberGraphData>;
  };
  queue?: {
    getQueueSummary?: () => Promise<AdminQueueSummary>;
  };
};

export type AdminServiceState = {
  ok: boolean;
  summary?: string;
  error?: string;
};

export type AdminOverviewData = {
  metrics: {
    totalSessions: number;
    recentFailures: number;
    distinctAgents: number;
    latestSessionAt: string | null;
    retrievalFeedbackCount: number;
    vectorCount: number;
    queueDepth: number;
  };
  graph: AdminGraphSummary;
  queue: AdminQueueSummary;
  services: {
    postgres: AdminServiceState;
    neo4j: AdminServiceState;
    redis: AdminServiceState;
  };
};

export type AdminSessionsPageData = {
  rows: AdminSessionListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: Omit<AdminSessionListFilters, "page" | "pageSize">;
};

export type AdminSessionDetailData = {
  session: AdminSessionDetail | null;
  feedback: AdminFeedbackRow[];
};

export type AdminDatabaseData = {
  tables: AdminTableSnapshot[];
};

export type AdminGraphData = {
  summary: AdminGraphSummary | null;
  labelCounts: AdminGraphCountRow[];
  relationshipCounts: AdminGraphCountRow[];
  recentNodes: AdminRecentNode[];
  queue: AdminQueueSummary | null;
};

type SearchParamsInput = Record<string, string | string[] | undefined>;
type PostgresLikeError = Error & { code?: string };

const EMPTY_MEMORY_VECTORS_TABLE: AdminTableSnapshot = {
  name: "memory_vectors",
  rowCount: 0,
  columns: [
    "memory_id",
    "namespace_id",
    "memory_type",
    "status",
    "retrieval_status",
    "updated_at",
  ],
  rows: [],
};

const getDeps = (deps?: AdminDeps) => ({
  postgres: {
    getOverviewCounts:
      deps?.postgres?.getOverviewCounts ?? defaultGetOverviewCounts,
    listSessions: deps?.postgres?.listSessions ?? defaultListSessions,
    getSessionDetail:
      deps?.postgres?.getSessionDetail ?? defaultGetSessionDetail,
    listFeedbackForNamespace:
      deps?.postgres?.listFeedbackForNamespace ??
      defaultListFeedbackForNamespace,
    getTableSnapshot:
      deps?.postgres?.getTableSnapshot ?? defaultGetTableSnapshot,
  },
  neo4j: {
    getGraphSummary:
      deps?.neo4j?.getGraphSummary ?? defaultGetGraphSummary,
    getLabelCounts: deps?.neo4j?.getLabelCounts ?? defaultGetLabelCounts,
    getRelationshipCounts:
      deps?.neo4j?.getRelationshipCounts ?? defaultGetRelationshipCounts,
    getRecentNodes: deps?.neo4j?.getRecentNodes ?? defaultGetRecentNodes,
    listSubscribers: deps?.neo4j?.listSubscribers ?? defaultListSubscribers,
    getSubscriberGraph:
      deps?.neo4j?.getSubscriberGraph ?? defaultGetSubscriberGraph,
  },
  queue: {
    getQueueSummary: deps?.queue?.getQueueSummary ?? defaultGetQueueSummary,
  },
});

export const normalizeAdminError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const isMissingRelationError = (error: unknown, relationName: string) => {
  const candidate = error as PostgresLikeError | undefined;
  return (
    candidate?.code === "42P01" ||
    (candidate instanceof Error &&
      candidate.message.includes(`relation "${relationName}" does not exist`))
  );
};

const parseString = (value: string | string[] | undefined) =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const parsePage = (value: string | string[] | undefined) => {
  const parsed = Number.parseInt(parseString(value) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const getAdminOverviewData = async ({
  deps,
}: {
  deps?: AdminDeps;
} = {}): Promise<AdminOverviewData> => {
  const resolved = getDeps(deps);
  const services: AdminOverviewData["services"] = {
    postgres: { ok: false, error: "Postgres unavailable" },
    neo4j: { ok: false, error: "Neo4j unavailable" },
    redis: { ok: false, error: "Redis unavailable" },
  };

  let counts: AdminOverviewCounts = {
    totalSessions: 0,
    recentFailures: 0,
    distinctAgents: 0,
    latestSessionAt: null,
    retrievalFeedbackCount: 0,
    vectorCount: 0,
  };
  let graph: AdminGraphSummary = {
    namespaceCount: 0,
    sessionCount: 0,
    learningCount: 0,
    relationshipCount: 0,
  };
  let queue: AdminQueueSummary = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    recentJobs: [],
  };

  await Promise.all([
    resolved.postgres
      .getOverviewCounts()
      .then((result) => {
        counts = result;
        services.postgres = {
          ok: true,
          summary: `${result.totalSessions} sessions`,
        };
      })
      .catch((error) => {
        services.postgres = {
          ok: false,
          error: normalizeAdminError(error, "Postgres unavailable"),
        };
      }),
    resolved.neo4j
      .getGraphSummary()
      .then((result) => {
        graph = result;
        services.neo4j = {
          ok: true,
          summary: `${result.learningCount} learnings`,
        };
      })
      .catch((error) => {
        services.neo4j = {
          ok: false,
          error: normalizeAdminError(error, "Neo4j unavailable"),
        };
      }),
    resolved.queue
      .getQueueSummary()
      .then((result) => {
        queue = result;
        services.redis = {
          ok: true,
          summary: `${result.waiting + result.active} jobs in flight`,
        };
      })
      .catch((error) => {
        services.redis = {
          ok: false,
          error: normalizeAdminError(error, "Redis unavailable"),
        };
      }),
  ]);

  return {
    metrics: {
      totalSessions: counts.totalSessions,
      recentFailures: counts.recentFailures,
      distinctAgents: counts.distinctAgents,
      latestSessionAt: counts.latestSessionAt,
      retrievalFeedbackCount: counts.retrievalFeedbackCount,
      vectorCount: counts.vectorCount,
      queueDepth: queue.waiting + queue.active,
    },
    graph,
    queue,
    services,
  };
};

export const getAdminSessionsPageData = async ({
  searchParams,
  deps,
}: {
  searchParams: SearchParamsInput;
  deps?: AdminDeps;
}): Promise<AdminSessionsPageData> => {
  const resolved = getDeps(deps);
  const page = parsePage(searchParams.page);
  const pageSize = 20;
  const filters = {
    subscriberId: parseString(searchParams.subscriberId),
    agentKind: parseString(searchParams.agentKind),
    agentId: parseString(searchParams.agentId),
    sessionId: parseString(searchParams.sessionId),
    outcomeStatus: parseString(searchParams.outcomeStatus),
    reflectionStatus: parseString(searchParams.reflectionStatus),
  };
  const result = await resolved.postgres.listSessions({
    page,
    pageSize,
    ...filters,
  });

  return {
    rows: result.rows,
    total: result.total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    filters,
  };
};

export const getAdminSessionDetailData = async (
  id: string,
  deps?: AdminDeps,
): Promise<AdminSessionDetailData> => {
  const resolved = getDeps(deps);
  const session = await resolved.postgres.getSessionDetail(id);

  if (!session) {
    return {
      session: null,
      feedback: [],
    };
  }

  const feedback = await resolved.postgres.listFeedbackForNamespace(
    session.subscriberId,
    session.agentKind,
    session.agentId,
    10,
  );

  return {
    session,
    feedback,
  };
};

export const getAdminDatabaseData = async (
  deps?: AdminDeps,
): Promise<AdminDatabaseData> => {
  const resolved = getDeps(deps);
  const tables = await Promise.all([
    resolved.postgres.getTableSnapshot("raw_sessions", 20),
    resolved.postgres.getTableSnapshot("retrieval_feedback", 20),
    resolved.postgres.getTableSnapshot("memory_vectors", 20).catch((error) => {
      if (isMissingRelationError(error, "memory_vectors")) {
        return EMPTY_MEMORY_VECTORS_TABLE;
      }

      throw error;
    }),
  ]);

  return { tables };
};

export const getAdminGraphData = async (
  deps?: AdminDeps,
): Promise<AdminGraphData> => {
  const resolved = getDeps(deps);
  const [summary, labelCounts, relationshipCounts, recentNodes, queue] =
    await Promise.all([
      resolved.neo4j.getGraphSummary().catch(() => null),
      resolved.neo4j.getLabelCounts().catch(() => []),
      resolved.neo4j.getRelationshipCounts().catch(() => []),
      resolved.neo4j.getRecentNodes(12).catch(() => []),
      resolved.queue.getQueueSummary().catch(() => null),
    ]);

  return {
    summary,
    labelCounts,
    relationshipCounts,
    recentNodes,
    queue,
  };
};

export const listAdminSubscribers = async (
  deps?: AdminDeps,
): Promise<AdminSubscriberSummary[]> => {
  const resolved = getDeps(deps);
  return resolved.neo4j.listSubscribers();
};

export const getAdminSubscriberGraphData = async (
  subscriberId: string,
  deps?: AdminDeps,
): Promise<AdminSubscriberGraphData> => {
  const resolved = getDeps(deps);
  return resolved.neo4j.getSubscriberGraph(subscriberId);
};
