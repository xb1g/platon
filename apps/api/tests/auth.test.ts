import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { authPlugin, type AuthContext } from "../src/plugins/auth.js";

const verifiedAuthContext: AuthContext = {
  subscriberId: "subscriber-token",
  agentId: "agent-token",
  agentKind: "support-agent",
  planId: "plan-token"
};

afterEach(async () => {
  delete process.env.NVM_API_KEY;
  delete process.env.NVM_PLAN_ID;
  delete process.env.NVM_AGENT_ID;
  delete process.env.NVM_ENVIRONMENT;
});

describe("authPlugin", () => {
  it("rejects unpaid protected requests", async () => {
    const app = Fastify();

    await app.register(authPlugin, {
      protectedRoutes: {
        "POST /sessions": true
      }
    });

    app.post("/sessions", async (request) => ({
      auth: request.authContext
    }));

    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: {
        subscriberId: "subscriber-body",
        agentId: "agent-body"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: "Unauthorized"
    });

    await app.close();
  });

  it("exposes normalized auth context from verified payment context", async () => {
    const app = Fastify();

    app.addHook("preHandler", async (request) => {
      request.paymentContext = {
        agentRequestId: "request-123",
        authContext: verifiedAuthContext,
        credits: 1n,
        paymentRequired: {} as any,
        token: "token-123"
      };
    });

    await app.register(authPlugin, {
      protectedRoutes: {
        "GET /whoami": true
      }
    });

    app.get("/whoami", async (request) => ({
      auth: request.authContext
    }));

    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/whoami"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      auth: verifiedAuthContext
    });

    await app.close();
  });

  it("does not allow request payload identity to override token-derived auth", async () => {
    const app = Fastify();

    app.addHook("preHandler", async (request) => {
      request.paymentContext = {
        agentRequestId: "request-123",
        authContext: verifiedAuthContext,
        credits: 1n,
        paymentRequired: {} as any,
        token: "token-123"
      };
    });

    await app.register(authPlugin, {
      protectedRoutes: {
        "POST /whoami": true
      }
    });

    app.post("/whoami", async (request) => ({
      auth: request.authContext,
      body: request.body
    }));

    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/whoami",
      payload: {
        subscriberId: "subscriber-body",
        agentId: "agent-body",
        agentKind: "billing-agent",
        planId: "plan-body"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      auth: verifiedAuthContext,
      body: {
        subscriberId: "subscriber-body",
        agentId: "agent-body",
        agentKind: "billing-agent",
        planId: "plan-body"
      }
    });

    await app.close();
  });
});
