import { beforeEach, describe, expect, it, vi } from "vitest";
const { poolQueryMock, queueAddMock } = vi.hoisted(() => ({
  poolQueryMock: vi.fn(),
  queueAddMock: vi.fn()
}));

vi.mock("../src/lib/postgres.js", () => ({
  pool: {
    query: poolQueryMock
  }
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(() => ({
    add: queueAddMock
  }))
}));

import { buildServer } from "../src/server.js";

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

describe("Sessions API", () => {
  beforeEach(() => {
    poolQueryMock.mockReset();
    queueAddMock.mockReset();

    poolQueryMock.mockImplementation(async (queryText: string) => {
      if (queryText.includes("INSERT INTO raw_sessions")) {
        return {
          rows: [
            {
              id: "stored-session-123"
            }
          ]
        };
      }

      return { rows: [] };
    });

    queueAddMock.mockResolvedValue({
      id: "job-123"
    });
  });

  it("requires verified auth context for protected requests", async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: {
        agentId: "agent-runtime",
        agentKind: "support-agent",
        sessionId: "session-123",
        task: {
          kind: "support-ticket",
          summary: "Investigate failed order sync"
        },
        outcome: {
          status: "failed",
          summary: "Order sync failed due to a missing external identifier"
        }
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Unauthorized"
    });

    await app.close();
  });

  it("uses verified auth identity instead of caller-supplied tenant data", async () => {
    const { app } = await buildPaidServer();

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        tenantId: "tenant-from-body",
        agentId: "agent-runtime",
        agentKind: "support-agent",
        sessionId: "session-123",
        task: {
          kind: "support-ticket",
          summary: "Investigate failed order sync"
        },
        outcome: {
          status: "failed",
          summary: "Order sync failed due to a missing external identifier"
        }
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: "stored-session-123",
      status: "queued",
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent"
    });

    await app.close();
  });

  it("enqueues a reflection job for the stored session row", async () => {
    const { app } = await buildPaidServer();

    const payload = {
      tenantId: "tenant-from-body",
      agentId: "agent-runtime",
      agentKind: "support-agent",
      sessionId: "session-123",
      task: {
        kind: "support-ticket",
        summary: "Investigate failed order sync"
      },
      outcome: {
        status: "failed" as const,
        summary: "Order sync failed due to a missing external identifier"
      }
    };

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: {
        "payment-signature": "token-123"
      },
      payload
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: "stored-session-123",
      status: "queued",
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent"
    });
    expect(queueAddMock).toHaveBeenCalledWith("reflect-session", {
      rawSessionId: "stored-session-123",
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
      url: "/sessions",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        agentId: "agent-from-body",
        agentKind: "support-agent",
        sessionId: "session-123",
        task: {
          kind: "support-ticket",
          summary: "Investigate failed order sync"
        },
        outcome: {
          status: "failed",
          summary: "Order sync failed due to a missing external identifier"
        }
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
