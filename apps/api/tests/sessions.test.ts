import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";

const {
  ensureSessionTable,
  insertRawSession,
  markReflectionQueued,
  enqueueReflectionJob
} = vi.hoisted(() => ({
  ensureSessionTable: vi.fn().mockResolvedValue(undefined),
  insertRawSession: vi.fn().mockResolvedValue({
    id: "stored-session-row-123",
    reflection_status: "queued"
  }),
  markReflectionQueued: vi.fn().mockResolvedValue(undefined),
  enqueueReflectionJob: vi.fn().mockResolvedValue({ id: "job-123" })
}));

vi.mock("../src/lib/session-store.js", () => ({
  ensureSessionTable,
  insertRawSession,
  markReflectionQueued
}));

vi.mock("../src/lib/reflection-queue.js", () => ({
  enqueueReflectionJob
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

describe("Sessions API", () => {
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
      id: "stored-session-row-123",
      status: "queued",
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent"
    });
    expect(ensureSessionTable).toHaveBeenCalledOnce();
    expect(insertRawSession).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriberId: "subscriber-runtime",
        agentKind: "support-agent",
        agentId: "agent-runtime",
        sessionId: "session-123"
      })
    );

    await app.close();
  });

  it("enqueues a reflection job for the stored session row", async () => {
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
    expect(enqueueReflectionJob).toHaveBeenCalledWith({
      rawSessionId: "stored-session-row-123",
      subscriberId: "subscriber-runtime",
      agentId: "agent-runtime",
      agentKind: "support-agent"
    });
    expect(markReflectionQueued).toHaveBeenCalledWith("stored-session-row-123");

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
