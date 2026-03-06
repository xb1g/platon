import { describe, expect, it, vi } from "vitest";
import type { NeverminedDiagnosticsResponse } from "../src/lib/nevermined.js";
import {
  assertNeverminedDiagnostics,
  buildSmokeRetrievePayload,
  parseSmokeVerificationEnv,
  runNeverminedSmokeVerification
} from "../src/scripts/verify-nevermined-smoke.js";

const buildDiagnostics = (
  overrides: Partial<NeverminedDiagnosticsResponse> = {}
): NeverminedDiagnosticsResponse => ({
  configured: true,
  environment: "sandbox",
  planId: "plan-123",
  agentId: "agent-456",
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
  },
  ...overrides
});

describe("verify-nevermined-smoke", () => {
  it("builds a stable default retrieve payload for x402 verification", () => {
    expect(buildSmokeRetrievePayload()).toEqual({
      agentId: "smoke-agent",
      agentKind: "smoke-test",
      query: "find similar failures",
      limit: 3
    });
  });

  it("parses required builder/runtime env for a 402 preflight check", () => {
    expect(
      parseSmokeVerificationEnv({
        NVM_PLAN_ID: "plan-123",
        NVM_AGENT_ID: "agent-123"
      })
    ).toMatchObject({
      apiUrl: "http://localhost:3001",
      agentId: "agent-123",
      planId: "plan-123",
      environment: "sandbox"
    });
  });

  it("marks paid verification as enabled only when subscriber credentials are present", () => {
    expect(
      parseSmokeVerificationEnv({
        NVM_PLAN_ID: "plan-123",
        NVM_AGENT_ID: "agent-123",
        NVM_SUBSCRIBER_API_KEY: "sandbox:subscriber-key"
      })
    ).toMatchObject({
      hasSubscriberApiKey: true
    });

    expect(
      parseSmokeVerificationEnv({
        NVM_PLAN_ID: "plan-123",
        NVM_AGENT_ID: "agent-123"
      })
    ).toMatchObject({
      hasSubscriberApiKey: false
    });
  });

  it("validates backend diagnostics before the 402 preflight", () => {
    expect(() =>
      assertNeverminedDiagnostics(
        buildDiagnostics(),
        {
          apiUrl: "http://localhost:3001",
          agentId: "agent-456",
          environment: "sandbox",
          hasSubscriberApiKey: false,
          planId: "plan-123"
        }
      )
    ).not.toThrow();

    expect(() =>
      assertNeverminedDiagnostics(
        buildDiagnostics({ environment: "live" }),
        {
          apiUrl: "http://localhost:3001",
          agentId: "agent-456",
          environment: "sandbox",
          hasSubscriberApiKey: false,
          planId: "plan-123"
        }
      )
    ).toThrow("Platon backend misconfiguration");
  });

  it("stops with a backend misconfiguration error before preflight when diagnostics do not match", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        configured: true,
        environment: "live",
        planId: "plan-123",
        agentId: "agent-456"
      })
    });

    await expect(
      runNeverminedSmokeVerification(
        {
          NVM_PLAN_ID: "plan-123",
          NVM_AGENT_ID: "agent-456",
          NVM_ENVIRONMENT: "sandbox"
        },
        {
          fetchFn,
          createPayments: vi.fn()
        }
      )
    ).rejects.toThrow("Platon backend misconfiguration");

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith("http://localhost:3001/nevermined.json", expect.any(Object));
  });

  it("reports missing subscriber credentials after diagnostics and preflight succeed", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          configured: true,
          environment: "sandbox",
          planId: "plan-123",
          agentId: "agent-456"
        })
      })
      .mockResolvedValueOnce({
        status: 402,
        headers: new Headers({
          "payment-required": Buffer.from(JSON.stringify({ accepts: [{ planId: "plan-123" }] })).toString("base64")
        }),
        text: async () => ""
      });

    await expect(
      runNeverminedSmokeVerification(
        {
          NVM_PLAN_ID: "plan-123",
          NVM_AGENT_ID: "agent-456"
        },
        {
          fetchFn,
          createPayments: vi.fn()
        }
      )
    ).resolves.toBeUndefined();

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("reports token acquisition failures after diagnostics and preflight succeed", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          configured: true,
          environment: "sandbox",
          planId: "plan-123",
          agentId: "agent-456"
        })
      })
      .mockResolvedValueOnce({
        status: 402,
        headers: new Headers({
          "payment-required": Buffer.from(JSON.stringify({ accepts: [{ planId: "plan-123" }] })).toString("base64")
        }),
        text: async () => ""
      });

    const createPayments = vi.fn().mockReturnValue({
      x402: {
        getX402AccessToken: vi.fn().mockRejectedValue(new Error("Cannot GET /api/v1/protocol/token"))
      }
    });

    await expect(
      runNeverminedSmokeVerification(
        {
          NVM_PLAN_ID: "plan-123",
          NVM_AGENT_ID: "agent-456",
          NVM_SUBSCRIBER_API_KEY: "sandbox:subscriber-key"
        },
        {
          fetchFn,
          createPayments
        }
      )
    ).rejects.toThrow("Nevermined token acquisition failed");
  });

  it("completes the full diagnostics, preflight, token, and paid retry flow", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          configured: true,
          environment: "sandbox",
          planId: "plan-123",
          agentId: "agent-456"
        })
      })
      .mockResolvedValueOnce({
        status: 402,
        headers: new Headers({
          "payment-required": Buffer.from(JSON.stringify({ accepts: [{ planId: "plan-123" }] })).toString("base64")
        }),
        text: async () => ""
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "payment-response": Buffer.from(JSON.stringify({ success: true })).toString("base64")
        }),
        json: async () => ({ results: [] }),
        text: async () => ""
      });

    const getX402AccessToken = vi.fn().mockResolvedValue({ accessToken: "token-123" });

    await expect(
      runNeverminedSmokeVerification(
        {
          NVM_PLAN_ID: "plan-123",
          NVM_AGENT_ID: "agent-456",
          NVM_SUBSCRIBER_API_KEY: "sandbox:subscriber-key"
        },
        {
          fetchFn,
          createPayments: vi.fn().mockReturnValue({
            x402: {
              getX402AccessToken
            }
          })
        }
      )
    ).resolves.toBeUndefined();

    expect(getX402AccessToken).toHaveBeenCalledWith("plan-123", "agent-456");
    expect(fetchFn).toHaveBeenLastCalledWith(
      "http://localhost:3001/retrieve",
      expect.objectContaining({
        headers: expect.objectContaining({
          "payment-signature": "token-123"
        })
      })
    );
  });
});
