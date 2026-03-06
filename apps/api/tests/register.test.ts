import { describe, expect, it } from "vitest";
import { validateRegisterNeverminedEnv } from "../src/scripts/register-nevermined-agent.js";

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
});
