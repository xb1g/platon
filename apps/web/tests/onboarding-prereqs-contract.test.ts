import { describe, expect, it } from "vitest";
import { agentInstallationMarkdown } from "../lib/agent-installation";
import { readFileSync } from "node:fs";

const readFixture = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("onboarding prereqs contract", () => {
  it("documents the self-hosted MCP operator prerequisites and transport contract", () => {
    expect(agentInstallationMarkdown).toContain("NVM_API_KEY");
    expect(agentInstallationMarkdown).toContain("PLATON_INTERNAL_AUTH_TOKEN");
    expect(agentInstallationMarkdown).toContain("Accept: application/json, text/event-stream");
    expect(agentInstallationMarkdown).toContain("Mcp-Session-Id");
  });

  it("includes an exact first-call MCP request profile", () => {
    expect(agentInstallationMarkdown).toContain('"method": "initialize"');
    expect(agentInstallationMarkdown).toContain('"protocolVersion": "2024-11-05"');
    expect(agentInstallationMarkdown).toContain('"method": "tools/call"');
    expect(agentInstallationMarkdown).toContain('"name": "memory.retrieve_context"');
    expect(agentInstallationMarkdown).toContain('"name": "memory.dump_session"');
  });

  it("keeps the integration guide aligned with the hosted install contract", () => {
    const integrationDoc = readFixture("../docs/INTEGRATION.md");

    expect(integrationDoc).toContain("NVM_API_KEY");
    expect(integrationDoc).toContain("PLATON_INTERNAL_AUTH_TOKEN");
    expect(integrationDoc).toContain("Accept: application/json, text/event-stream");
    expect(integrationDoc).toContain("Mcp-Session-Id");
    expect(integrationDoc).toContain('"method": "initialize"');
    expect(integrationDoc).toContain('"name": "memory.retrieve_context"');
    expect(integrationDoc).toContain('"name": "memory.dump_session"');
  });
});
