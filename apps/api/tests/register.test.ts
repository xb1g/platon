import { describe, expect, it } from "vitest";
import {
  buildApiRegistration,
  validateRegisterNeverminedEnv
} from "../src/scripts/register-nevermined-agent.js";

describe("register-nevermined-agent", () => {
  it("throws when required Nevermined builder env vars are missing", () => {
    expect(() =>
      validateRegisterNeverminedEnv({
        NVM_ENVIRONMENT: "sandbox"
      })
    ).toThrowError(/NVM_API_KEY, BUILDER_ADDRESS/);
  });

  it("accepts the required Nevermined builder env vars", () => {
    expect(
      validateRegisterNeverminedEnv({
        NVM_API_KEY: "sandbox:test-key",
        NVM_ENVIRONMENT: "sandbox",
        BUILDER_ADDRESS: "0x1234567890abcdef1234567890abcdef12345678"
      })
    ).toMatchObject({
      apiKey: "sandbox:test-key",
      builderAddress: "0x1234567890abcdef1234567890abcdef12345678",
      environment: "sandbox",
      publicUrl: "http://localhost:3001"
    });
  });

  it("builds the agent registration payload using documented endpoint mappings", () => {
    expect(
      buildApiRegistration({
        apiKey: "sandbox:test-key",
        environment: "sandbox",
        builderAddress: "0x1234567890abcdef1234567890abcdef12345678",
        publicUrl: "https://memory.example",
        agentName: "Platon Memory API",
        planName: "Platon Memory Credits"
      })
    ).toMatchObject({
      agentApi: {
        agentDefinitionUrl: "https://memory.example/openapi.json",
        endpoints: [
          { POST: "https://memory.example/sessions" },
          { POST: "https://memory.example/retrieve" }
        ],
        openEndpoints: [
          "https://memory.example/health",
          "https://memory.example/openapi.json"
        ]
      },
      agentMetadata: {
        name: "Platon Memory API",
        tags: ["memory", "x402", "api"]
      },
      planMetadata: {
        name: "Platon Memory Credits"
      },
      price: 1n,
      creditsConfig: {
        amountOfCredits: 1_000n,
        minCreditsToCharge: 1n
      }
    });
  });
});
