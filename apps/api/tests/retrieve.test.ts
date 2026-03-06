import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";
import { ensureNamespaceNode, resolveNamespace } from "../src/lib/memory-namespace.js";

vi.mock("../src/lib/retrieval/graph-search.js", () => ({
  graphSearch: vi.fn().mockResolvedValue([
    {
      id: "graph-1",
      type: "learning",
      title: "Retry after refreshing the external identifier cache",
      summary: "A prior failure succeeded after a cache refresh.",
      confidence: 0.91,
      reasons: [],
      sourceProvenance: []
    }
  ])
}));

vi.mock("../src/lib/retrieval/vector-search.js", () => ({
  vectorSearch: vi.fn().mockResolvedValue([
    {
      id: "vector-1",
      type: "learning",
      title: "Use the cached tenant mapping before retrying",
      summary: "A semantically similar memory from the vector index.",
      confidence: 0.72,
      reasons: [],
      sourceProvenance: []
    }
  ])
}));

const { getRetrievalFeedbackSummaries } = vi.hoisted(() => ({
  getRetrievalFeedbackSummaries: vi.fn().mockResolvedValue(
    new Map([
      [
        "graph-1",
        {
          usefulCount: 3,
          harmfulCount: 0,
          score: 1
        }
      ]
    ])
  )
}));

vi.mock("../src/lib/retrieval/feedback-store.js", () => ({
  getRetrievalFeedbackSummaries
}));

vi.mock("../src/lib/retrieval/rank.js", () => ({
  rankResults: vi.fn().mockReturnValue([
    {
      id: "memory-1",
      type: "learning",
      title: "Retry after refreshing the external identifier cache",
      summary: "A prior failure succeeded after a cache refresh.",
      confidence: 0.91,
      reasons: [
        {
          kind: "usefulness",
          summary: "Earlier retrievals marked this memory as useful.",
          score: 1
        }
      ],
      usefulness: {
        usefulCount: 3,
        harmfulCount: 0,
        score: 1
      }
    }
  ])
}));

vi.mock("../src/lib/neo4j.js", () => ({
  getSession: () => ({
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

const paywallConfig = {
  apiKey: "sandbox:test-key",
  environment: "sandbox" as const,
  planId: "plan-runtime",
  agentId: "agent-runtime"
};

const buildPaidServer = async () => {
  const verifyPermissions = vi.fn().mockResolvedValue({
    agentRequestId: "request-123",
    isValid: true,
    payer: "subscriber-runtime"
  });

  const settlePermissions = vi.fn().mockResolvedValue({
    success: true
  });

  const app = await buildServer({
    paywall: {
      config: paywallConfig,
      payments: {
        facilitator: {
          verifyPermissions,
          settlePermissions
        }
      }
    }
  });

  return { app, settlePermissions };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("MemoryNamespace resolution", () => {
  it("resolves namespace using subscriberId, agentKind, and agentId", () => {
    const ns = resolveNamespace({
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-abc"
    });

    expect(ns.namespaceId).toBeDefined();
    expect(ns.namespaceId.length).toBe(32);
    expect(ns.subscriberId).toBe("sub-001");
    expect(ns.agentKind).toBe("support-agent");
    expect(ns.agentId).toBe("agent-abc");
  });

  it("produces deterministic namespaceId for same inputs", () => {
    const params = {
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-abc"
    };

    const ns1 = resolveNamespace(params);
    const ns2 = resolveNamespace(params);

    expect(ns1.namespaceId).toBe(ns2.namespaceId);
  });

  it("produces different namespaceId for different subscriberIds", () => {
    const ns1 = resolveNamespace({
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-abc"
    });

    const ns2 = resolveNamespace({
      subscriberId: "sub-002",
      agentKind: "support-agent",
      agentId: "agent-abc"
    });

    expect(ns1.namespaceId).not.toBe(ns2.namespaceId);
  });

  it("produces different namespaceId for different agentKinds", () => {
    const ns1 = resolveNamespace({
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-abc"
    });

    const ns2 = resolveNamespace({
      subscriberId: "sub-001",
      agentKind: "billing-agent",
      agentId: "agent-abc"
    });

    expect(ns1.namespaceId).not.toBe(ns2.namespaceId);
  });

  it("produces different namespaceId for different agentIds", () => {
    const ns1 = resolveNamespace({
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-abc"
    });

    const ns2 = resolveNamespace({
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-xyz"
    });

    expect(ns1.namespaceId).not.toBe(ns2.namespaceId);
  });
});

describe("ensureNamespaceNode", () => {
  it("runs MERGE query with correct namespace parameters", async () => {
    const mockRun = vi.fn().mockResolvedValue({ records: [] });
    const mockSession = { run: mockRun } as any;

    const ns = await ensureNamespaceNode(mockSession, {
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-abc"
    });

    expect(mockRun).toHaveBeenCalledOnce();
    const [query, params] = mockRun.mock.calls[0];
    expect(query).toContain("MERGE");
    expect(query).toContain("MemoryNamespace");
    expect(params.namespaceId).toBe(ns.namespaceId);
    expect(params.subscriberId).toBe("sub-001");
    expect(params.agentKind).toBe("support-agent");
    expect(params.agentId).toBe("agent-abc");
  });

  it("returns resolved namespace with stable id", async () => {
    const mockSession = { run: vi.fn().mockResolvedValue({ records: [] }) } as any;

    const ns = await ensureNamespaceNode(mockSession, {
      subscriberId: "sub-001",
      agentKind: "support-agent",
      agentId: "agent-abc"
    });

    expect(ns.namespaceId).toBeDefined();
    expect(ns.namespaceId.length).toBe(32);
  });
});

describe("Retrieve API", () => {
  it("requires verified auth context for protected requests", async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        query: "find similar failures"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Unauthorized"
    });

    await app.close();
  });

  it("uses verified subscriber identity instead of caller-supplied tenant data", async () => {
    const { app } = await buildPaidServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        tenantId: "tenant-from-body",
        agentId: "agent-runtime",
        agentKind: "support-agent",
        query: "find similar failures"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      results: [
        {
          id: "memory-1",
          type: "learning",
          title: "Retry after refreshing the external identifier cache",
          summary: "A prior failure succeeded after a cache refresh.",
          confidence: 0.91,
          reasons: [
            {
              kind: "usefulness",
              summary: "Earlier retrievals marked this memory as useful.",
              score: 1
            }
          ],
          usefulness: {
            usefulCount: 3,
            harmfulCount: 0,
            score: 1
          }
        }
      ],
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent"
    });

    await app.close();
  });

  it("redeems credits after a successful paid retrieval", async () => {
    const { app, settlePermissions } = await buildPaidServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        query: "find similar failures"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(settlePermissions).toHaveBeenCalledOnce();

    await app.close();
  });

  it("hydrates auth-scoped usefulness feedback before ranking", async () => {
    const { app } = await buildPaidServer();
    const { rankResults } = await import("../src/lib/retrieval/rank.js");

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        query: "find similar failures"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(getRetrievalFeedbackSummaries).toHaveBeenCalledWith({
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent",
      memoryIds: ["graph-1", "vector-1"]
    });
    expect(rankResults).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "graph-1",
          usefulness: {
            usefulCount: 3,
            harmfulCount: 0,
            score: 1
          }
        })
      ],
      [
        expect.objectContaining({
          id: "vector-1"
        })
      ]
    );

    await app.close();
  });

  it("passes retrieval filters into both graph and vector search", async () => {
    const { app } = await buildPaidServer();
    const { graphSearch } = await import("../src/lib/retrieval/graph-search.js");
    const { vectorSearch } = await import("../src/lib/retrieval/vector-search.js");

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        query: "postgres lock timeout",
        filters: {
          statuses: ["failed"],
          toolNames: ["psql"]
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(graphSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          statuses: ["failed"],
          toolNames: ["psql"]
        }
      }),
      expect.any(Object)
    );
    expect(vectorSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          statuses: ["failed"],
          toolNames: ["psql"]
        }
      }),
      expect.any(Object)
    );

    await app.close();
  });
});
