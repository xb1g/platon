#!/usr/bin/env -S npx tsx
/**
 * Claude Hooks Stop adapter for Platon.
 * Builds a structured session dump payload and POSTs it to the Platon API.
 *
 * Opt-in: set PLATON_HOOKS_ENABLED=1 and configure agent identity.
 * Add to .claude/settings.json:
 *   "hooks": { "Stop": [{ "hooks": [{ "type": "command", "command": "npx tsx apps/mcp/examples/claude-hooks/stop.ts" }] }] }
 */

import { buildDumpPayload, type StopHookInput } from "./payload-builders.js";

const API_URL = process.env.PLATON_API_URL ?? "https://platon.bigf.me/api";
const SUBSCRIBER_ID = process.env.PLATON_LOCAL_DEV_SUBSCRIBER_ID ?? process.env.PLATON_SUBSCRIBER_ID;
const PAYMENT_TOKEN = process.env.PLATON_PAYMENT_TOKEN ?? "";

async function main(): Promise<void> {
  if (process.env.PLATON_HOOKS_ENABLED !== "1") {
    process.exit(0);
  }

  const agentId = process.env.PLATON_AGENT_ID ?? "claude-code";
  const agentKind = process.env.PLATON_AGENT_KIND ?? "codex";

  let input: StopHookInput;
  try {
    const raw = await readStdin();
    input = JSON.parse(raw) as StopHookInput;
  } catch {
    process.exit(0);
  }

  const payload = buildDumpPayload(input, { agentId, agentKind });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-platon-subscriber-id": SUBSCRIBER_ID ?? "",
  };
  if (PAYMENT_TOKEN) {
    headers["payment-signature"] = PAYMENT_TOKEN;
  }

  try {
    const res = await fetch(`${API_URL}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Platon dump failed: ${err}`);
      process.exit(0);
    }

    const result = (await res.json()) as { id?: string };
    if (process.env.PLATON_HOOKS_VERBOSE === "1") {
      console.error(`Platon session dumped: ${result.id ?? "unknown"}`);
    }
  } catch (e) {
    console.error(`Platon dump error: ${(e as Error).message}`);
  }

  process.exit(0);
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
