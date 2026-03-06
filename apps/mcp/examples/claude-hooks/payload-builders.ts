/**
 * Payload builders for Claude Hooks adapter example.
 * Builds canonical retrieve and dump payloads from hook input.
 * Unit-tested to ensure contract alignment.
 */

import type { SessionPayload } from "@memory/shared";

export type SessionStartHookInput = {
  session_id: string;
  transcript_path?: string;
  cwd?: string;
  source?: string;
  model?: string;
  agent_type?: string;
};

export type StopHookInput = {
  session_id: string;
  transcript_path?: string;
  cwd?: string;
  last_assistant_message?: string;
  stop_hook_active?: boolean;
};

export type RetrievePayload = {
  agentId: string;
  agentKind: string;
  query: string;
  limit?: number;
  filters?: Record<string, unknown>;
};

/**
 * Build retrieve payload for SessionStart.
 * Uses config for agent identity; query from env or default.
 */
export function buildRetrievePayload(
  input: SessionStartHookInput,
  config: { agentId: string; agentKind: string; query?: string }
): RetrievePayload {
  const query = config.query ?? process.env.PLATON_RETRIEVE_QUERY ?? "recent context";
  return {
    agentId: config.agentId,
    agentKind: config.agentKind,
    query,
    limit: 5,
    filters: {},
  };
}

/**
 * Build dump payload for Stop hook.
 * Derives task and outcome from last_assistant_message.
 */
export function buildDumpPayload(
  input: StopHookInput,
  config: { agentId: string; agentKind: string }
): SessionPayload {
  const summary = input.last_assistant_message ?? "Session ended";
  return {
    agentId: config.agentId,
    agentKind: config.agentKind,
    sessionId: input.session_id,
    task: { kind: "claude-conversation", summary },
    outcome: { status: "partial", summary },
    tools: [],
    events: [],
    artifacts: [],
    errors: [],
  };
}
