#!/usr/bin/env -S npx tsx
/**
 * Claude Hooks SessionStart adapter for Platon.
 * Retrieves context from Platon and returns it as additionalContext for Claude.
 *
 * Opt-in: set PLATON_HOOKS_ENABLED=1 and configure agent identity.
 * Add to .claude/settings.json:
 *   "hooks": { "SessionStart": [{ "hooks": [{ "type": "command", "command": "npx tsx apps/mcp/examples/claude-hooks/session-start.ts" }] }] }
 */

import { buildRetrievePayload, type SessionStartHookInput } from "./payload-builders.js";

const API_URL = process.env.PLATON_API_URL ?? "https://platon.bigf.me/api";
const SUBSCRIBER_ID = process.env.PLATON_LOCAL_DEV_SUBSCRIBER_ID ?? process.env.PLATON_SUBSCRIBER_ID;
const PAYMENT_TOKEN = process.env.PLATON_PAYMENT_TOKEN ?? "";

async function main(): Promise<void> {
  if (process.env.PLATON_HOOKS_ENABLED !== "1") {
    process.exit(0);
  }

  const agentId = process.env.PLATON_AGENT_ID ?? "claude-code";
  const agentKind = process.env.PLATON_AGENT_KIND ?? "codex";

  let input: SessionStartHookInput;
  try {
    const raw = await readStdin();
    input = JSON.parse(raw) as SessionStartHookInput;
  } catch {
    process.exit(0);
  }

  const payload = buildRetrievePayload(input, {
    agentId,
    agentKind,
    query: process.env.PLATON_RETRIEVE_QUERY,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-platon-subscriber-id": SUBSCRIBER_ID ?? "",
  };
  if (PAYMENT_TOKEN) {
    headers["payment-signature"] = PAYMENT_TOKEN;
  }

  try {
    const res = await fetch(`${API_URL}/retrieve`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      process.exit(0);
    }

    const data = (await res.json()) as { results?: Array<{ title: string; summary: string; confidence: number }> };
    const results = data.results ?? [];
    const context = results
      .map((r, i) => `${i + 1}. [${r.confidence.toFixed(2)}] ${r.title}: ${r.summary}`)
      .join("\n");

    if (context) {
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: `Platon context:\n${context}`,
          },
        })
      );
    }
  } catch {
    process.exit(0);
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}

main();
