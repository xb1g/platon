import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";

vi.mock("../src/lib/retrieval/graph-search.js", () => ({
  graphSearch: vi.fn().mockResolvedValue([{ id: "graph-1" }])
}));

vi.mock("../src/lib/retrieval/vector-search.js", () => ({
  vectorSearch: vi.fn().mockResolvedValue([{ id: "vector-1" }])
}));

vi.mock("../src/lib/retrieval/rank.js", () => ({
  rankResults: vi.fn().mockReturnValue([
    {
      id: "memory-1",
      type: "learning",
      title: "Retry after refreshing the external identifier cache",
      summary: "A prior failure succeeded after a cache refresh.",
      confidence: 0.91
    }
  ])
}));

const paywallConfig = {
  apiKey: "sandbox:test-key",
  environment: "sandbox" as const,
  planId: "plan-runtime",
  agentId: "agent-runtime"
};

const buildPaidServer = async () => {
  const startProcessingRequest = vi.fn().mockResolvedValue({
    agentRequestId: "request-123",
    agentId: "agent-runtime",
    agentKind: "support-agent",
    balance: {
      isSubscriber: true
    },
    planId: "plan-runtime",
    subscriberId: "subscriber-runtime"
  });

  const redeemCreditsFromRequest = vi.fn().mockResolvedValue({
    success: true
  });

  const app = await buildServer({
    paywall: {
      config: paywallConfig,
      payments: {
        requests: {
          redeemCreditsFromRequest,
          startProcessingRequest
        }
      }
    }
  });

  return { app, redeemCreditsFromRequest };
};

afterEach(() => {
  vi.clearAllMocks();
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
          confidence: 0.91
        }
      ],
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent"
    });

    await app.close();
  });

  it("rejects requests whose agent identity does not match the verified auth context", async () => {
    const { app, redeemCreditsFromRequest } = await buildPaidServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-runtime",
        agentKind: "billing-agent",
        query: "find similar failures"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: "Forbidden",
      message: "Payload agent identity does not match verified auth context"
    });
    expect(redeemCreditsFromRequest).not.toHaveBeenCalled();

    await app.close();
  });
});
