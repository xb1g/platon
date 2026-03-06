export const AGENT_INSTALLATION_BASE_URL = "https://platon.bigf.me";
export const AGENT_INSTALLATION_PATH = "/agent-installation.md";
export const AGENT_INSTALLATION_URL = `${AGENT_INSTALLATION_BASE_URL}${AGENT_INSTALLATION_PATH}`;
export const MCP_ENDPOINT_URL = `${AGENT_INSTALLATION_BASE_URL}/mcp`;
export const API_BASE_URL = `${AGENT_INSTALLATION_BASE_URL}/api`;
export const REPOSITORY_URL = "https://github.com/xb1g/platon";
export const PLATON_REPORT_EVERY_TASK_SKILL_NAME = "platon-report-every-task";
export const PLATON_REPORT_EVERY_TASK_SKILL_REPO_PATH =
  `.agents/skills/${PLATON_REPORT_EVERY_TASK_SKILL_NAME}`;
export const PLATON_REPORT_EVERY_TASK_SKILL_URL =
  `${REPOSITORY_URL}/tree/main/${PLATON_REPORT_EVERY_TASK_SKILL_REPO_PATH}`;
export const EMBEDDED_PLAN_ID =
  "73169765125098902371333949161624114039157379307050553178571193711771922123338";
export const EMBEDDED_AGENT_ID =
  "19346478288243105495031065907200687372039626635874134001440870868803651261845";

export const agentOperatorPrompt = `Install Platon memory for this agent.

1. Read ${AGENT_INSTALLATION_URL} and follow it exactly.
2. Keep these identity fields stable across every run:
   - \`agentKind\`
   - \`agentId\`
3. Make \`memory.retrieve_context\` the first real action on every new task. Call it with a plain-language summary of the work before planning or execution.
4. \`memory.retrieve_context\` is cheap, so call it again whenever the task changes shape, a new bounded subtask starts, or you are entering a risky area.
5. If you are handling an error, risky step, or repeated issue, call \`memory.get_similar_failures\`.
6. After every task, call \`memory.dump_session\` with the task, outcome, tools, key events, errors, and artifacts.
7. Always record failed and partial runs. Those are valuable memory.
8. Do not rename the Platon tool names or identity fields.
9. If Platon is temporarily unavailable, continue the task and record that outage in the next session dump.

Use this for any autonomous agent: coding, research, browser, support, operations, workflow, or assistant agents.`;

export const agentInstallationMarkdown = `# Platon Agent Installation

This document tells an autonomous agent, or the human operator configuring that agent, how to install and use Platon persistent memory.

## Operator Shortcut

Paste this into your agent:

\`\`\`text
Install Platon memory for this agent.

1. Read ${AGENT_INSTALLATION_URL} and follow it exactly.
2. Keep these identity fields stable across every run:
   - agentKind
   - agentId
3. Make \`memory.retrieve_context\` the first real action on every new task. Call it with a plain-language summary of the work before planning or execution.
4. \`memory.retrieve_context\` is cheap, so call it again whenever the task changes shape, a new bounded subtask starts, or you are entering a risky area.
5. If you are handling an error, risky step, or repeated issue, call \`memory.get_similar_failures\`.
6. After every task, call \`memory.dump_session\` with the task, outcome, tools, key events, errors, and artifacts.
7. Always record failed and partial runs. Those are valuable memory.
8. Do not rename the Platon tool names or identity fields.
9. If Platon is temporarily unavailable, continue the task and record that outage in the next session dump.
\`\`\`

## What Platon Does

Platon gives an autonomous agent a persistent operational memory.

- Before work, the agent can retrieve relevant prior context.
- Retrieval is cheap, so the default is to call it at task startup and again when the task branches into a new bounded subtask.
- During debugging or incident work, the agent can retrieve similar past failures.
- After work, the agent records what happened so future runs can learn from it.

## Retrieval Default

Teach the agent to retrieve early rather than waiting until it is stuck.

- Call \`memory.retrieve_context\` immediately when a new task arrives.
- Call it again when the goal changes, a bounded subtask starts, or the agent is about to take a risky action.
- Do not skip retrieval because the task looks small, familiar, or urgent.
- Prefer an extra retrieval call over skipping context on startup.
- Use plain-language summaries so the retrieval query carries enough signal.

## Task Startup Sequence

The default startup sequence for each new task is:

1. Receive the task.
2. Call \`memory.retrieve_context\` immediately with a plain-language summary.
3. If the area is failure-prone or the task already includes an error, call \`memory.get_similar_failures\`.
4. Plan and execute using the retrieved context.
5. Call \`memory.dump_session\` before handoff.

This workflow is useful for coding agents, research agents, browser agents, support agents, workflow agents, autonomous operations agents, and other task-oriented assistants.

## Required Identity Contract

Every agent must keep these fields stable:

- \`agentKind\`: the agent role or class, for example \`"research-agent"\`, \`"ops-agent"\`, or \`"browser-agent"\`
- \`agentId\`: the stable identifier for the specific deployed agent, for example \`"ops-prod-01"\`

Do not rotate or rename these casually. If you change them, Platon will treat the caller as a different agent with a different memory namespace.

Each task run also needs a fresh \`sessionId\`.

## Installation Options

### Option 1: Remote MCP

If your runtime supports remote MCP, connect it to:

\`\`\`text
${MCP_ENDPOINT_URL}
\`\`\`

Platon exposes these tools over MCP:

- \`memory.retrieve_context\`
- \`memory.get_similar_failures\`
- \`memory.dump_session\`

If your MCP transport requires payment or auth headers, configure them in the transport layer rather than in tool arguments.

### Option 2: HTTP API

If your runtime does not support MCP, call the Platon HTTP API directly:

\`\`\`text
${API_BASE_URL}
\`\`\`

Use:

- \`POST /retrieve\`
- \`POST /sessions\`

## Self-Hosted Paid MCP Prerequisites

If you run your own paid MCP server, the operator must set these variables before the server starts:

- \`NVM_API_KEY\`: required for Nevermined-backed paid MCP startup. The server exits at startup if it is missing.
- \`PLATON_INTERNAL_AUTH_TOKEN\`: required for MCP-to-API forwarding. The server exits at startup if it is missing.
- \`NVM_ENVIRONMENT\`: set \`sandbox\` or \`live\`.
- \`MEMORY_API_URL\`: optional override for the backing API base URL.

Keep the operator env separate from the caller transport contract:

- server operator sets \`NVM_API_KEY\` and \`PLATON_INTERNAL_AUTH_TOKEN\`
- MCP caller sends \`Authorization: Bearer <x402-access-token>\`
- MCP caller also sends \`Accept: application/json, text/event-stream\`
- MCP caller reuses the returned \`Mcp-Session-Id\` header on the next MCP requests

If you are self-hosting locally, a first-run shell can look like this:

\`\`\`bash
NVM_API_KEY=sandbox:your-nevermined-key \\
PLATON_INTERNAL_AUTH_TOKEN=replace-with-a-random-secret \\
NVM_ENVIRONMENT=sandbox \\
MEMORY_API_URL=http://localhost:3001 \\
pnpm --filter @memory/mcp dev
\`\`\`

## Acquire An x402 Token

For the hosted paid service, subscribe with a Nevermined subscriber key and generate an x402 token before calling MCP or the direct HTTP API:

Hosted Platon uses these identifiers:

- \`NVM_PLAN_ID=${EMBEDDED_PLAN_ID}\`
- \`NVM_AGENT_ID=${EMBEDDED_AGENT_ID}\`

\`\`\`ts
import { Payments } from "@nevermined-io/payments";

const subscriberPayments = Payments.getInstance({
  nvmApiKey: process.env.NVM_SUBSCRIBER_API_KEY!,
  environment: (process.env.NVM_ENVIRONMENT ?? "sandbox") as "sandbox" | "live",
});

// First purchase only. Skip when you already have balance on the plan.
await subscriberPayments.plans.orderPlan("${EMBEDDED_PLAN_ID}");

const { accessToken } = await subscriberPayments.x402.getX402AccessToken(
  "${EMBEDDED_PLAN_ID}",
  "${EMBEDDED_AGENT_ID}",
);
\`\`\`

Use the generated token like this:

- MCP transport: \`Authorization: Bearer <x402-access-token>\`
- Direct API calls: \`payment-signature: <x402-access-token>\`

If you are upgrading from \`@nevermined-io/payments@1.0.0-rc14\`, do not use \`payments.agents.getAgentAccessToken(...)\` for the hosted Platon flow. That older helper targets a backend route that can return 404 in current sandbox environments. Use \`payments.x402.getX402AccessToken(...)\` instead.

## Exact First MCP Request Profile

For a first successful remote MCP connection, use the StreamableHTTP headers exactly as shown here. The \`Authorization\` token belongs on the MCP transport, not inside tool arguments.

### 1. Initialize

\`\`\`bash
curl -i -X POST ${MCP_ENDPOINT_URL} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "Authorization: Bearer <x402-access-token>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "platon-smoke",
        "version": "1.0.0"
      }
    }
  }'
\`\`\`

Read the \`Mcp-Session-Id\` response header and send it on every later MCP request in the same session.

### 2. Retrieve Context

\`\`\`bash
curl -i -X POST ${MCP_ENDPOINT_URL} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "Authorization: Bearer <x402-access-token>" \\
  -H "Mcp-Session-Id: <session-id-from-initialize>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "memory.retrieve_context",
      "arguments": {
        "agentKind": "code-assistant",
        "agentId": "agent-prod-01",
        "query": "Summarize prior failures and tactics for today's task",
        "limit": 5
      }
    }
  }'
\`\`\`

### 3. Dump Session

\`\`\`bash
curl -i -X POST ${MCP_ENDPOINT_URL} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "Authorization: Bearer <x402-access-token>" \\
  -H "Mcp-Session-Id: <session-id-from-initialize>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "memory.dump_session",
      "arguments": {
        "agentKind": "code-assistant",
        "agentId": "agent-prod-01",
        "sessionId": "session-2026-03-06-001",
        "task": {
          "kind": "debug",
          "summary": "Investigate the onboarding prerequisites failure path"
        },
        "outcome": {
          "status": "success",
          "summary": "Documented the required startup env and first-call MCP contract"
        }
      }
    }
  }'
\`\`\`

## Required Runtime Behavior

Every agent that uses Platon should follow this loop:

1. Before a task, retrieve context.
2. If the work includes an error or likely failure mode, retrieve similar failures too.
3. Complete the task.
4. Dump the full session result.

This loop matters more than the specific runtime. The same operating pattern applies whether the agent writes code, researches, browses websites, handles tickets, runs workflows, or executes operations tasks.

## Before Every Task

Call \`memory.retrieve_context\` or \`POST /retrieve\` with:

- \`agentKind\`
- \`agentId\`
- \`query\`: a plain-language summary of the work about to happen
- optional \`limit\`
- optional \`filters\`

Good query examples:

- \`"Review a failing CI pipeline for a Node.js monorepo"\`
- \`"Research customer churn causes for enterprise accounts"\`
- \`"Investigate why a browser checkout flow hangs after payment"\`
- \`"Resolve repeated 401 responses from a partner API"\`

Use the returned context to adjust your plan before acting.

## When You Hit A Risk Or Error

Call \`memory.get_similar_failures\` if:

- you see a concrete error
- the task is entering a risky migration or deploy step
- the agent has repeated the same mistake more than once

Pass the error message or a concise description of the failure mode.

Use returned failure summaries as preventive guidance, not as blind truth. Prefer high-confidence, clearly relevant results.

## After Every Task

Call \`memory.dump_session\` or \`POST /sessions\` with a structured session payload.

Minimum fields:

\`\`\`json
{
  "agentKind": "browser-agent",
  "agentId": "checkout-prod-01",
  "sessionId": "session-2026-03-06-001",
  "task": {
    "kind": "checkout-investigation",
    "summary": "Investigate why payment confirmation hangs in the hosted checkout flow"
  },
  "outcome": {
    "status": "failed",
    "summary": "Checkout stalled after payment provider redirect because a required callback route was missing"
  }
}
\`\`\`

Recommended optional fields:

- \`tools\`
- \`events\`
- \`errors\`
- \`artifacts\`
- \`humanFeedback\`

Always dump failed and partial runs. Those are often the most useful memory.

## Minimal API Examples

### Retrieve

\`\`\`bash
curl -X POST ${API_BASE_URL}/retrieve \\
  -H "Content-Type: application/json" \\
  -H "payment-signature: <x402-access-token>" \\
  -d '{
    "agentKind": "research-agent",
    "agentId": "market-research-prod-01",
    "query": "Find prior research about B2B churn causes in enterprise accounts",
    "limit": 5
  }'
\`\`\`

### Dump Session

\`\`\`bash
curl -X POST ${API_BASE_URL}/sessions \\
  -H "Content-Type: application/json" \\
  -H "payment-signature: <x402-access-token>" \\
  -d '{
    "agentKind": "research-agent",
    "agentId": "market-research-prod-01",
    "sessionId": "session-2026-03-06-002",
    "task": {
      "kind": "market-research",
      "summary": "Summarize the top enterprise churn drivers from customer interviews"
    },
    "outcome": {
      "status": "success",
      "summary": "Compiled five recurring churn drivers with supporting interview excerpts"
    },
    "artifacts": [
      {
        "kind": "report",
        "uri": "/reports/churn-drivers-2026-03-06.md",
        "summary": "Enterprise churn driver summary"
      }
    ]
  }'
\`\`\`

## Verification Checklist

An installation is complete only when the agent can:

- retrieve context before a task
- retrieve similar failures during error handling
- dump a successful session
- dump a failed session
- keep \`agentKind\` and \`agentId\` stable between runs

## Operating Rules

- Do not change tool names.
- Do not invent replacement field names for the payload.
- Do not skip session dumps because a task failed.
- Do not assume retrieved memory is always correct; evaluate relevance and confidence.
- If Platon is unavailable, continue the task and log the outage in the next available session dump.

## Canonical URL

Use this file as the primary installation reference:

\`\`\`text
${AGENT_INSTALLATION_URL}
\`\`\`
`;
