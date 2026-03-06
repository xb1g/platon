import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET } from "../app/agent-installation.md/route";
import {
  AGENT_INSTALLATION_URL,
  agentInstallationMarkdown,
  agentOperatorPrompt,
} from "../lib/agent-installation";

const readFixture = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("agent installation content", () => {
  it("publishes the hosted markdown contract with markdown headers", async () => {
    const response = GET();

    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toContain(
      "agent-installation.md",
    );
    await expect(response.text()).resolves.toBe(agentInstallationMarkdown);
  });

  it("points operators to the hosted markdown file", () => {
    expect(agentOperatorPrompt).toContain(AGENT_INSTALLATION_URL);
    expect(agentInstallationMarkdown).toContain(AGENT_INSTALLATION_URL);
  });

  it("includes the required Platon tool names", () => {
    expect(agentOperatorPrompt).toContain("memory.retrieve_context");
    expect(agentOperatorPrompt).toContain("memory.get_similar_failures");
    expect(agentOperatorPrompt).toContain("memory.dump_session");
  });

  it("describes runtime-neutral agent usage", () => {
    expect(agentOperatorPrompt).toContain("coding, research, browser, support, operations, workflow, or assistant agents");
    expect(agentInstallationMarkdown).toContain("coding agents, research agents, browser agents, support agents, workflow agents, autonomous operations agents");
  });

  it("documents the x402 token flow for hosted usage", () => {
    expect(agentInstallationMarkdown).toContain("payments.x402.getX402AccessToken");
    expect(agentInstallationMarkdown).toContain("Authorization: Bearer <x402-access-token>");
    expect(agentInstallationMarkdown).toContain("payment-signature: <x402-access-token>");
  });

  it("includes a migration note for the deprecated rc14 token helper", () => {
    expect(agentInstallationMarkdown).toContain("@nevermined-io/payments@1.0.0-rc14");
    expect(agentInstallationMarkdown).toContain("payments.agents.getAgentAccessToken");
  });

  it("keeps the homepage installation panel tied to the shared hosted contract", () => {
    const landingPage = readFixture("../app/(marketing)/page.tsx");

    expect(landingPage).toContain('from "@/lib/agent-installation"');
    expect(landingPage).toContain("agentOperatorPrompt");
    expect(landingPage).toContain("AGENT_INSTALLATION_URL");
    expect(landingPage).not.toContain("127.0.0.1:7679");
    expect(landingPage).not.toContain("X-Debug-Session-Id");
  });

  it("does not ship localhost debug ingestion hooks in the root layout", () => {
    const rootLayout = readFixture("../app/layout.tsx");

    expect(rootLayout).not.toContain("127.0.0.1:7679");
    expect(rootLayout).not.toContain("X-Debug-Session-Id");
  });
});
