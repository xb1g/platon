import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";

const { recordRetrievalFeedback } = vi.hoisted(() => ({
  recordRetrievalFeedback: vi.fn()
}));

const { memoryExistsInNamespace } = vi.hoisted(() => ({
  memoryExistsInNamespace: vi.fn().mockResolvedValue(true)
}));

vi.mock("../src/lib/retrieval/feedback-store.js", () => ({
  recordRetrievalFeedback
}));

vi.mock("../src/lib/retrieval/memory-exists.js", () => ({
  memoryExistsInNamespace
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

  return { app };
};

afterEach(() => {
  vi.clearAllMocks();
  memoryExistsInNamespace.mockResolvedValue(true);
});

describe("Retrieval feedback API", () => {
  it("requires verified auth context for protected requests", async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieval-feedback",
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        memoryId: "memory-1",
        verdict: "useful"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Unauthorized"
    });

    await app.close();
  });

  it("records useful feedback against the verified subscriber namespace", async () => {
    recordRetrievalFeedback.mockResolvedValue({
      usefulCount: 2,
      harmfulCount: 0,
      score: 1
    });

    const { app } = await buildPaidServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieval-feedback",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        memoryId: "memory-1",
        query: "find similar failures",
        verdict: "useful"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(memoryExistsInNamespace).toHaveBeenCalledOnce();
    expect(recordRetrievalFeedback).toHaveBeenCalledWith({
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent",
      memoryId: "memory-1",
      query: "find similar failures",
      verdict: "useful"
    });
    expect(response.json()).toEqual({
      status: "recorded",
      memoryId: "memory-1",
      verdict: "useful",
      usefulness: {
        usefulCount: 2,
        harmfulCount: 0,
        score: 1
      }
    });

    await app.close();
  });

  it("records harmful feedback and returns the updated usefulness summary", async () => {
    recordRetrievalFeedback.mockResolvedValue({
      usefulCount: 2,
      harmfulCount: 1,
      score: 0.3333
    });

    const { app } = await buildPaidServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieval-feedback",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        memoryId: "memory-1",
        verdict: "harmful"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(recordRetrievalFeedback).toHaveBeenCalledWith({
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent",
      memoryId: "memory-1",
      query: undefined,
      verdict: "harmful"
    });
    expect(response.json()).toEqual({
      status: "recorded",
      memoryId: "memory-1",
      verdict: "harmful",
      usefulness: {
        usefulCount: 2,
        harmfulCount: 1,
        score: 0.3333
      }
    });

    await app.close();
  });

  it("rejects feedback for memories outside the authenticated namespace", async () => {
    memoryExistsInNamespace.mockResolvedValue(false);
    const { app } = await buildPaidServer();

    const response = await app.inject({
      method: "POST",
      url: "/retrieval-feedback",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        memoryId: "missing-memory",
        verdict: "useful"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Memory not found"
    });
    expect(recordRetrievalFeedback).not.toHaveBeenCalled();

    await app.close();
  });
});
