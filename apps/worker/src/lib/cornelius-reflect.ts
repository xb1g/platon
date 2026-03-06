import type { StoredSessionPayload } from './session-store.js';
import type { ReflectionData } from './store-reflection.js';
import { parseReflectionModelOutput } from './reflection-schema.js';
import { createReflectionPrompt } from './reflection-prompt.js';

const TRINITY_URL = process.env.TRINITY_URL ?? 'https://mcp-us14.abilityai.dev/mcp';
const TRINITY_TOKEN = process.env.TRINITY_AUTH_TOKEN;
const CORNELIUS_AGENT = process.env.CORNELIUS_AGENT_NAME ?? 'cornelius';
const CORNELIUS_TIMEOUT_MS = Number(process.env.CORNELIUS_TIMEOUT_MS ?? 120_000);

type McpEventData = {
  result?: { content?: Array<{ type: string; text: string }> };
  error?: { code: number; message: string };
};

async function initTrinitySession(): Promise<string> {
  const res = await fetch(TRINITY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${TRINITY_TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'platon-worker', version: '1.0' },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const sessionId = res.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('Trinity session init failed: no mcp-session-id header');
  }
  return sessionId;
}

async function callTrinityTool(
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs: number,
): Promise<string> {
  const res = await fetch(TRINITY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${TRINITY_TOKEN}`,
      'Mcp-Session-Id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  const dataLine = text.split('\n').find(line => line.startsWith('data: '));
  if (!dataLine) {
    throw new Error(`Trinity tool call returned no data. Status: ${res.status}`);
  }

  const parsed: McpEventData = JSON.parse(dataLine.slice(6));
  if (parsed.error) {
    throw new Error(`Trinity tool error: ${parsed.error.message}`);
  }

  const content = parsed.result?.content?.[0]?.text;
  if (!content) {
    throw new Error('Trinity tool call returned empty content');
  }

  return content;
}

const CORNELIUS_REFLECT_PROMPT = `You are acting as a reflection engine for the Platon memory system.
Analyze the agent session below and return ONLY a valid JSON object — no markdown, no prose, no code fences.

The JSON must have exactly these keys:
- wentWell: string[] — what succeeded, with specific evidence from the session
- wentWrong: string[] — what failed or was suboptimal
- likelyCauses: string[] — root causes of failures (empty array if no failures)
- reusableTactics: string[] — concrete tactics that can be reused in future sessions
- learnings: Array<{title: string, confidence: number}> — at least one unique insight; use your insight-extractor to find non-obvious patterns and connections; check your Brain for related notes to avoid duplicates and discover links
- confidence: number — 0 to 1, overall trust in this reflection

Be specific, evidence-based, and grounded only in the session content.
Prioritize novel learnings over obvious observations.

Session:
`;

export const corneliusReflect = async (
  data: StoredSessionPayload,
): Promise<ReflectionData> => {
  if (!TRINITY_TOKEN) {
    throw new Error('TRINITY_AUTH_TOKEN is required for Cornelius-based reflection');
  }

  const sessionId = await initTrinitySession();
  const prompt = CORNELIUS_REFLECT_PROMPT + createReflectionPrompt(data);

  const rawOutput = await callTrinityTool(
    sessionId,
    'chat_with_agent',
    {
      agent_name: CORNELIUS_AGENT,
      message: prompt,
      parallel: true,
      timeout_seconds: Math.floor(CORNELIUS_TIMEOUT_MS / 1000),
    },
    CORNELIUS_TIMEOUT_MS + 5_000,
  );

  const structured = parseReflectionModelOutput(rawOutput);

  return {
    sessionId: data.sessionId,
    taskSummary: data.task.summary,
    outcomeSummary: data.outcome.summary,
    ...structured,
  };
};

export const isCorneliusConfigured = (): boolean =>
  Boolean(process.env.TRINITY_AUTH_TOKEN);
