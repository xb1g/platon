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

  const verifyPermissions = vi.fn().mockResolvedValue({
    agentRequestId: "request-123",
    isValid: true,
    payer: "subscriber-789"
  });
  const settlePermissions = vi.fn().mockResolvedValue({
    data: { amountOfCredits: 1 },
    success: true,
    txHash: "0xabc"
  });

  await app.register(paywallPlugin, {
    config: baseConfig,
    payments: {
      facilitator: {
        verifyPermissions,
        settlePermissions
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

  return { app, settlePermissions, verifyPermissions };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("paywallPlugin", () => {
  it("leaves health public", async () => {
    const { app, settlePermissions, verifyPermissions } = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(verifyPermissions).not.toHaveBeenCalled();
    expect(settlePermissions).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns 402 with a payment-required header for unpaid protected requests", async () => {
    const { app, settlePermissions, verifyPermissions } = await buildApp();

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
    expect(verifyPermissions).not.toHaveBeenCalled();
    expect(settlePermissions).not.toHaveBeenCalled();

    await app.close();
  });

  it("verifies and settles protected requests that include a payment token", async () => {
    const { app, settlePermissions, verifyPermissions } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123"
      },
      payload: {
        tenantId: "tenant-1",
        agentId: "agent-1",
        agentKind: "support-agent",
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
        agentId: "agent-1",
        agentKind: "support-agent",
        planId: "plan-123"
      },
      results: []
    });
    expect(response.headers["payment-response"]).toBeTruthy();
    expect(verifyPermissions).toHaveBeenCalledOnce();
    expect(settlePermissions).toHaveBeenCalledOnce();
    expect(verifyPermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        x402AccessToken: "token-123",
        maxAmount: 1n
      })
    );
    expect(settlePermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        x402AccessToken: "token-123",
        maxAmount: 1n,
        agentRequestId: "request-123"
      })
    );

    await app.close();
  });

  it("does not redeem credits when the payment token is invalid", async () => {
    const { app, settlePermissions, verifyPermissions } = await buildApp();

    verifyPermissions.mockResolvedValueOnce({
      isValid: false,
      invalidReason: "invalid token"
    });

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
      message: "invalid token"
    });
    expect(settlePermissions).not.toHaveBeenCalled();

    await app.close();
  });

  it("verifies internal MCP requests but skips settlement when internal auth is trusted", async () => {
    process.env.PLATON_INTERNAL_AUTH_TOKEN = "internal-secret";
    const { app, settlePermissions, verifyPermissions } = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/retrieve",
      headers: {
        "payment-signature": "token-123",
        "x-platon-internal-auth": "internal-secret"
      },
      payload: {
        agentId: "agent-1",
        agentKind: "support-agent",
        query: "redis failure",
        limit: 5,
        filters: {
          statuses: [],
          toolNames: []
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(verifyPermissions).toHaveBeenCalledOnce();
    expect(settlePermissions).not.toHaveBeenCalled();

    await app.close();
    delete process.env.PLATON_INTERNAL_AUTH_TOKEN;
  });

  it("allows trusted local bypass when Nevermined config is missing", async () => {
    process.env.PLATON_INTERNAL_AUTH_TOKEN = "internal-secret";
    process.env.PLATON_ALLOW_INTERNAL_AUTH_BYPASS = "1";
    const app = Fastify();

    await app.register(paywallPlugin);
    app.post("/sessions", async (request) => ({
      auth: request.paymentContext?.authContext ?? null
    }));
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      headers: {
        "x-platon-internal-auth": "internal-secret"
      },
      payload: {
        agentId: "agent-1",
        agentKind: "support-agent"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      auth: {
        subscriberId: "local-smoke-subscriber",
        agentId: "agent-1",
        agentKind: "support-agent",
        planId: "local-internal-bypass"
      }
    });

    await app.close();
    delete process.env.PLATON_INTERNAL_AUTH_TOKEN;
    delete process.env.PLATON_ALLOW_INTERNAL_AUTH_BYPASS;
  });
});
