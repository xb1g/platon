import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paywallPlugin } from "../src/plugins/paywall.js";

const baseConfig = {
  apiKey: "sandbox:test-key",
  environment: "sandbox" as const,
  planId: "plan-123",
  agentId: "agent-456"
};

const buildApp = async () => {
  const app = Fastify();

  const startProcessingRequest = vi.fn().mockResolvedValue({
    agentRequestId: "request-123",
    agentId: "agent-runtime",
    agentKind: "support-agent",
    balance: {
      balance: 100n,
      isSubscriber: true
    },
    planId: "plan-123",
    subscriberId: "subscriber-789"
  });
  const redeemCreditsFromRequest = vi.fn().mockResolvedValue({
    data: { amountOfCredits: 1 },
    success: true,
    txHash: "0xabc"
  });

  await app.register(paywallPlugin, {
    config: baseConfig,
    payments: {
      requests: {
        redeemCreditsFromRequest,
        startProcessingRequest
      }
    }
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.post("/sessions", async (request) => ({
    auth: request.paymentContext?.authContext ?? null,
    id: "session-1"
  }));
  app.post("/retrieve", async (request) => ({
    auth: request.paymentContext?.authContext ?? null,
    results: []
  }));

  await app.ready();

  return { app, redeemCreditsFromRequest, startProcessingRequest };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("paywallPlugin", () => {
  it("leaves health public", async () => {
    const { app, redeemCreditsFromRequest, startProcessingRequest } = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(startProcessingRequest).not.toHaveBeenCalled();
    expect(redeemCreditsFromRequest).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns 402 with a payment-required header for unpaid protected requests", async () => {
    const { app, redeemCreditsFromRequest, startProcessingRequest } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: {
        tenantId: "tenant-1",
        agentId: "agent-1",
        sessionId: "session-1",
        task: { kind: "debug", summary: "Investigate a failure" },
        outcome: { status: "success", summary: "Resolved" }
      }
    });

    expect(response.statusCode).toBe(402);
    expect(response.json()).toMatchObject({ error: "Payment Required" });
    expect(response.headers["payment-required"]).toBeTruthy();
    expect(
      JSON.parse(Buffer.from(String(response.headers["payment-required"]), "base64").toString("utf8"))
    ).toMatchObject({
      accepts: [
        {
          extra: {
            agentId: "agent-456"
          },
          planId: "plan-123"
        }
      ]
    });
    expect(startProcessingRequest).not.toHaveBeenCalled();
    expect(redeemCreditsFromRequest).not.toHaveBeenCalled();

    await app.close();
  });

  it("verifies and settles protected requests that include a payment token", async () => {
    const { app, redeemCreditsFromRequest, startProcessingRequest } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        tenantId: "tenant-1",
        agentId: "agent-1",
        query: "redis failure",
        limit: 5,
        filters: {
          statuses: [],
          toolNames: []
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      auth: {
        subscriberId: "subscriber-789",
        agentId: "agent-runtime",
        agentKind: "support-agent",
        planId: "plan-123"
      },
      results: []
    });
    expect(response.headers["payment-response"]).toBeTruthy();
    expect(startProcessingRequest).toHaveBeenCalledOnce();
    expect(redeemCreditsFromRequest).toHaveBeenCalledOnce();
    expect(startProcessingRequest).toHaveBeenCalledWith(
      "agent-456",
      "token-123",
      "http://localhost:80/retrieve",
      "POST"
    );
    expect(redeemCreditsFromRequest).toHaveBeenCalledWith("request-123", "token-123", 1n);

    await app.close();
  });

  it("does not redeem credits when the payment token is invalid", async () => {
    const { app, redeemCreditsFromRequest, startProcessingRequest } = await buildApp();

    startProcessingRequest.mockRejectedValueOnce(new Error("invalid token"));

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: {
        "payment-signature": "bad-token"
      },
      payload: {
        agentId: "agent-1",
        agentKind: "support-agent",
        sessionId: "session-1",
        task: { kind: "debug", summary: "Investigate a failure" },
        outcome: { status: "success", summary: "Resolved" }
      }
    });

    expect(response.statusCode).toBe(402);
    expect(response.json()).toMatchObject({
      error: "Payment Required",
      message: "Invalid x402 access token"
    });
    expect(redeemCreditsFromRequest).not.toHaveBeenCalled();

    await app.close();
  });
});
