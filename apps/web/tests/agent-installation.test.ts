import { describe, expect, it } from "vitest";
import {
  AGENT_INSTALLATION_URL,
  agentInstallationMarkdown,
  agentOperatorPrompt,
} from "@/lib/agent-installation";

describe("agent installation content", () => {
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
});
