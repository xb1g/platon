import { describe, expect, it, vi } from "vitest";
import {
  getAdminDatabaseData,
  getAdminOverviewData,
  getAdminSessionsPageData,
  normalizeAdminError,
} from "../lib/admin/queries";

describe("admin queries", () => {
  it("aggregates overview metrics from live backend dependencies", async () => {
    const data = await getAdminOverviewData({
      deps: {
        postgres: {
          getOverviewCounts: vi.fn().mockResolvedValue({
            totalSessions: 42,
            recentFailures: 5,
            distinctAgents: 7,
            latestSessionAt: "2026-03-06T12:00:00.000Z",
            retrievalFeedbackCount: 13,
            vectorCount: 21,
          }),
        },
        neo4j: {
          getGraphSummary: vi.fn().mockResolvedValue({
            namespaceCount: 3,
            sessionCount: 9,
            learningCount: 11,
            relationshipCount: 18,
          }),
        },
        queue: {
          getQueueSummary: vi.fn().mockResolvedValue({
            waiting: 2,
            active: 1,
            completed: 8,
            failed: 1,
            recentJobs: [],
          }),
        },
      },
    });

    expect(data.metrics.totalSessions).toBe(42);
    expect(data.metrics.recentFailures).toBe(5);
    expect(data.metrics.distinctAgents).toBe(7);
    expect(data.metrics.retrievalFeedbackCount).toBe(13);
    expect(data.metrics.vectorCount).toBe(21);
    expect(data.metrics.queueDepth).toBe(3);
    expect(data.graph.learningCount).toBe(11);
    expect(data.services.postgres.ok).toBe(true);
    expect(data.services.neo4j.ok).toBe(true);
    expect(data.services.redis.ok).toBe(true);
  });

  it("maps session filters into the query layer and returns pagination metadata", async () => {
    const listSessions = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "row-1",
          subscriberId: "sub-1",
          agentKind: "browser-agent",
          agentId: "checkout-prod-01",
          sessionId: "sess-1",
          taskKind: "checkout",
          taskSummary: "Investigate checkout stall",
          outcomeStatus: "failed",
          outcomeSummary: "Callback route missing",
          reflectionStatus: "failed",
          createdAt: "2026-03-06T11:00:00.000Z",
        },
      ],
      total: 1,
    });

    const result = await getAdminSessionsPageData({
      searchParams: {
        page: "2",
        subscriberId: "sub-1",
        agentKind: "browser-agent",
        reflectionStatus: "failed",
      },
      deps: {
        postgres: {
          listSessions,
        },
      },
    });

    expect(listSessions).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      subscriberId: "sub-1",
      agentKind: "browser-agent",
      agentId: undefined,
      sessionId: undefined,
      outcomeStatus: undefined,
      reflectionStatus: "failed",
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it("normalizes backend errors into bounded admin messages", () => {
    expect(normalizeAdminError(new Error("database offline"), "fallback")).toBe(
      "database offline",
    );
    expect(normalizeAdminError("weird", "fallback")).toBe("fallback");
  });

  it("keeps the database admin view available when memory_vectors is absent", async () => {
    const getTableSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        name: "raw_sessions",
        rowCount: 4,
        columns: ["id"],
        rows: [{ id: "raw-1" }],
      })
      .mockResolvedValueOnce({
        name: "retrieval_feedback",
        rowCount: 2,
        columns: ["id"],
        rows: [{ id: 1 }],
      })
      .mockRejectedValueOnce(new Error('relation "memory_vectors" does not exist'));

    const result = await getAdminDatabaseData({
      postgres: {
        getTableSnapshot,
      },
    });

    expect(getTableSnapshot).toHaveBeenNthCalledWith(1, "raw_sessions", 20);
    expect(getTableSnapshot).toHaveBeenNthCalledWith(2, "retrieval_feedback", 20);
    expect(getTableSnapshot).toHaveBeenNthCalledWith(3, "memory_vectors", 20);
    expect(result.tables).toEqual([
      {
        name: "raw_sessions",
        rowCount: 4,
        columns: ["id"],
        rows: [{ id: "raw-1" }],
      },
      {
        name: "retrieval_feedback",
        rowCount: 2,
        columns: ["id"],
        rows: [{ id: 1 }],
      },
      {
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
      },
    ]);
  });
});
