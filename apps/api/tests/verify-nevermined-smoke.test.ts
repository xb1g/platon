import { describe, expect, it } from "vitest";
import {
  buildSmokeRetrievePayload,
  parseSmokeVerificationEnv
} from "../src/scripts/verify-nevermined-smoke.js";

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
});
