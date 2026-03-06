import { describe, expect, it } from "vitest";
import { sessionPayloadSchema } from "@memory/shared";
import {
  buildDumpPayload,
  buildRetrievePayload,
  type SessionStartHookInput,
  type StopHookInput,
} from "../examples/claude-hooks/payload-builders.js";

describe("buildRetrievePayload", () => {
  it("produces canonical retrieve payload with agent identity and query", () => {
    const input: SessionStartHookInput = {
      session_id: "abc123",
      cwd: "/home/user",
      source: "startup",
    };
    const config = { agentId: "agent-1", agentKind: "codex", query: "deploy" };

    const payload = buildRetrievePayload(input, config);

    expect(payload).toMatchObject({
      agentId: "agent-1",
      agentKind: "codex",
      query: "deploy",
      limit: 5,
    });
    expect(payload.filters).toEqual({});
  });

  it("uses default query when not provided", () => {
    const input: SessionStartHookInput = { session_id: "x" };
    const config = { agentId: "a", agentKind: "codex" };

    const payload = buildRetrievePayload(input, config);

    expect(payload.query).toBe("recent context");
  });
});

describe("buildDumpPayload", () => {
  it("produces canonical session payload accepted by sessionPayloadSchema", () => {
    const input: StopHookInput = {
      session_id: "sess-123",
      last_assistant_message: "Refactored the auth module.",
    };
    const config = { agentId: "agent-1", agentKind: "codex" };

    const payload = buildDumpPayload(input, config);

    expect(payload).toMatchObject({
      agentId: "agent-1",
      agentKind: "codex",
      sessionId: "sess-123",
      task: { kind: "claude-conversation", summary: "Refactored the auth module." },
      outcome: { status: "partial", summary: "Refactored the auth module." },
    });
    expect(payload.tools).toEqual([]);
    expect(payload.events).toEqual([]);
    expect(payload.artifacts).toEqual([]);
    expect(payload.errors).toEqual([]);

    const parsed = sessionPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("uses default summary when last_assistant_message is absent", () => {
    const input: StopHookInput = { session_id: "sess-456" };
    const config = { agentId: "a", agentKind: "codex" };

    const payload = buildDumpPayload(input, config);

    expect(payload.task.summary).toBe("Session ended");
    expect(payload.outcome.summary).toBe("Session ended");
    expect(sessionPayloadSchema.safeParse(payload).success).toBe(true);
  });
});
