import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

const originalEnv = {
  NVM_API_KEY: process.env.NVM_API_KEY,
  NVM_ENVIRONMENT: process.env.NVM_ENVIRONMENT,
  NVM_PLAN_ID: process.env.NVM_PLAN_ID,
  NVM_AGENT_ID: process.env.NVM_AGENT_ID,
};

afterEach(() => {
  process.env.NVM_API_KEY = originalEnv.NVM_API_KEY;
  process.env.NVM_ENVIRONMENT = originalEnv.NVM_ENVIRONMENT;
  process.env.NVM_PLAN_ID = originalEnv.NVM_PLAN_ID;
  process.env.NVM_AGENT_ID = originalEnv.NVM_AGENT_ID;
});

const fakePayments = {
  facilitator: {
    verifyPermissions: async () => ({
      agentRequestId: "request-123",
      isValid: true,
      payer: "subscriber-789"
    }),
    settlePermissions: async () => ({
      data: { amountOfCredits: 1 },
      success: true,
      txHash: "0xabc"
    })
  }
};

describe("API server metadata", () => {
  it("serves Nevermined diagnostics even when backend config is missing", async () => {
    delete process.env.NVM_API_KEY;
    delete process.env.NVM_PLAN_ID;
    delete process.env.NVM_AGENT_ID;
    delete process.env.NVM_ENVIRONMENT;

    const app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/nevermined.json"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      configured: false,
      environment: null,
      agentId: null,
      planId: null,
      tokenAcquisition: {
        sdkPackage: "@nevermined-io/payments",
        recommendedMethod: "payments.x402.getX402AccessToken",
        minimumVersion: "1.1.6",
        deprecatedMethods: ["payments.agents.getAgentAccessToken"]
      },
      transport: {
        apiHeader: "payment-signature",
        mcpHeader: "Authorization: Bearer <x402-access-token>"
      },
      docs: {
        integrationPath: "/agent-installation.md",
        openApiPath: "/openapi.json"
      }
    });

    await app.close();
  });

  it("serves Nevermined diagnostics with configured backend values", async () => {
    const app = await buildServer({
      paywall: {
        config: {
          apiKey: "sandbox:test-key",
          environment: "live",
          planId: "plan-123",
          agentId: "agent-456"
        },
        payments: fakePayments as any
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/nevermined.json"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      configured: true,
      environment: "live",
      planId: "plan-123",
      agentId: "agent-456"
    });

    await app.close();
  });

  it("serves an OpenAPI definition for Nevermined agent registration", async () => {
    const app = await buildServer({
      paywall: {
        config: {
          apiKey: "sandbox:test-key",
          environment: "sandbox",
          planId: "plan-123",
          agentId: "agent-456"
        },
        payments: fakePayments as any
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/openapi.json"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "Platon Memory API"
      },
      paths: {
        "/sessions": {
          post: {
            operationId: "dumpSession"
          }
        },
        "/retrieve": {
          post: {
            operationId: "retrieveContext"
          }
        },
        "/nevermined.json": {
          get: {
            operationId: "neverminedDiagnostics"
          }
        }
      }
    });

    await app.close();
  });
});
