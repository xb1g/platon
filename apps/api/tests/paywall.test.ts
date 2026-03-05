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
    balance: {
      balance: 100n,
      isSubscriber: true
    }
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
  app.post("/sessions", async () => ({ id: "session-1" }));
  app.post("/retrieve", async () => ({ results: [] }));

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
    expect(response.json()).toEqual({ results: [] });
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
});
