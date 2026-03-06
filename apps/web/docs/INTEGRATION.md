# Platon Integration Guide

Add persistent memory to your AI agents in minutes.

The canonical hosted installation contract lives at `https://platon.bigf.me/agent-installation.md`.
Use that URL when bootstrapping an autonomous agent. This guide expands on the transport,
local development, and self-hosting details behind the hosted contract.

---

## Quick Start

### Option 1: Paid HTTP MCP Server

Run the MCP server and connect to its HTTP endpoint:

```bash
pnpm --filter @memory/mcp dev
```

Endpoint:

```text
http://localhost:3000/mcp
```

Paid MCP calls use a Nevermined x402 token in the HTTP transport header:

```http
Authorization: Bearer <x402-access-token>
```

Backend diagnostics are available at:

```text
https://platon.bigf.me/nevermined.json
```

Use that endpoint to confirm the deployed `environment`, `planId`, `agentId`, and the canonical token-acquisition method before attempting a paid call.

Acquire that token with a Nevermined subscriber key:

```ts
import { Payments } from "@nevermined-io/payments"

const subscriberPayments = Payments.getInstance({
  nvmApiKey: process.env.NVM_SUBSCRIBER_API_KEY!,
  environment: (process.env.NVM_ENVIRONMENT ?? "sandbox") as "sandbox" | "live",
})

await subscriberPayments.plans.orderPlan(process.env.NVM_PLAN_ID!) // first purchase only

const { accessToken } = await subscriberPayments.x402.getX402AccessToken(
  process.env.NVM_PLAN_ID!,
  process.env.NVM_AGENT_ID!,
)
```

If you are upgrading from `@nevermined-io/payments@1.0.0-rc14`, do not use `payments.agents.getAgentAccessToken(...)` for Platon. That older helper can hit a sandbox route that returns `404`. Use `payments.x402.getX402AccessToken(...)` instead.

Your agent now has access to three tools:

| Tool | Description |
|------|-------------|
| `memory.dump_session` | Persist a session for reflection and learning |
| `memory.retrieve_context` | Query relevant memories before a task |
| `memory.get_similar_failures` | Find similar past failures to avoid |

Paid MCP server operators must also set these runtime variables before boot:

- `NVM_API_KEY`
- `PLATON_INTERNAL_AUTH_TOKEN`
- `NVM_ENVIRONMENT`
- optional `MEMORY_API_URL`

The caller transport contract is separate:

- `Authorization: Bearer <x402-access-token>`
- `Accept: application/json, text/event-stream`
- reuse `Mcp-Session-Id` after `initialize`

Exact first-run MCP profile:

```bash
curl -i -X POST https://platon.bigf.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <x402-access-token>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "platon-smoke", "version": "1.0.0" }
    }
  }'
```

```bash
curl -i -X POST https://platon.bigf.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <x402-access-token>" \
  -H "Mcp-Session-Id: <session-id-from-initialize>" \
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
```

```bash
curl -i -X POST https://platon.bigf.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <x402-access-token>" \
  -H "Mcp-Session-Id: <session-id-from-initialize>" \
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
        "task": { "kind": "debug", "summary": "Investigate the onboarding prerequisites failure path" },
        "outcome": { "status": "success", "summary": "Documented the required startup env and first-call MCP contract" }
      }
    }
  }'
```

### Option 2: REST API

```bash
curl -X POST https://platon.bigf.me/api/sessions \
  -H "payment-signature: $X402_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentKind": "code-assistant",
    "agentId": "my-agent",
    "sessionId": "sess-001",
    "task": { "kind": "code-review", "summary": "Review PR #42" },
    "outcome": { "status": "success", "summary": "3 issues found and fixed" },
    "tools": [
      { "name": "git-diff", "category": "vcs" },
      { "name": "eslint", "category": "linting" }
    ],
    "events": [
      { "type": "start", "summary": "Session initiated" },
      { "type": "analysis", "summary": "Analyzed 12 files" },
      { "type": "complete", "summary": "Review submitted" }
    ],
    "artifacts": [
      { "kind": "report", "uri": "/reports/pr-42.md", "summary": "Review report" }
    ],
    "errors": [],
    "humanFeedback": { "rating": 5, "summary": "Great catch!" }
  }'
```

---

## API Endpoints

### POST /sessions

Dump a session for reflection and storage.

**Request Body:**

```typescript
{
  tenantId: string;        // Your tenant ID
  agentId: string;         // Agent identifier
  sessionId: string;       // Unique session ID
  task: {
    kind: string;          // e.g. "code-review", "deployment", "testing"
    summary: string;       // What the task was about
  };
  outcome: {
    status: "success" | "failed" | "partial";
    summary: string;
  };
  tools?: { name: string; category: string }[];
  events?: { type: string; summary: string }[];
  artifacts?: { kind: string; uri: string; summary?: string }[];
  errors?: { message: string; code?: string; retryable: boolean }[];
  humanFeedback?: { rating: 1-5; summary: string };
}
```

**Response:** `201 Created`

```json
{ "id": "sess-xxx", "status": "queued", "agentId": "my-agent", "agentKind": "code-assistant" }
```

### POST /retrieve

Query the memory graph for relevant context.

**Request Body:**

```typescript
{
  tenantId: string;
  agentId: string;
  query: string;           // Natural language query
  limit?: number;          // Max results (1-20, default 5)
  filters?: {
    statuses?: ("success" | "failed" | "partial")[];
    toolNames?: string[];
  };
}
```

**Response:**

```json
{
  "results": [
    {
      "id": "learn-001",
      "type": "learning" | "session" | "failure" | "success_pattern",
      "title": "Always validate env vars before Docker builds",
      "summary": "Pre-flight check prevents build failures...",
      "confidence": 0.95
    }
  ]
}
```

---

## MCP Tools Reference

### memory.dump_session

Persist a completed session for reflection. Use the same structured payload as the HTTP API. Payment is attached to the MCP transport via `Authorization: Bearer <token>`, not inside tool arguments.

```json
{
  "sessionId": "sess-001",
  "agentId": "my-agent",
  "agentKind": "code-assistant",
  "task": { "kind": "code-review", "summary": "Review PR #42" },
  "outcome": { "status": "success", "summary": "3 issues found and fixed" },
  "tools": [{ "name": "git-diff", "category": "vcs" }],
  "events": [{ "type": "complete", "summary": "Review submitted" }],
  "errors": []
}
```

### memory.retrieve_context

Retrieve relevant memories before starting a task.

```json
{
  "query": "How should I handle Stripe webhook signature verification?"
}
```

### memory.get_similar_failures

Find past failures similar to a current error.

```json
{
  "error": "Docker build failed: STRIPE_KEY not found in env"
}
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NVM_API_KEY` | Nevermined API key used by the paid MCP server |
| `NVM_ENVIRONMENT` | `sandbox` or `live` |
| `NVM_AGENT_ID` | Nevermined agent ID for MCP monetization |
| `NVM_PLAN_ID` | Nevermined plan ID for subscribers |
| `PLATON_INTERNAL_AUTH_TOKEN` | Internal shared secret for MCP-to-API forwarding without double settlement |
| `MEMORY_API_URL` | Backing Platon API base URL (default: `http://localhost:3001`) |

---

## Self-Hosting

```bash
git clone https://github.com/platon-dev/platon.git
cd platon
cp .env.example .env        # Configure your database URLs
docker compose up -d         # Start Postgres, Neo4j, Redis
pnpm install && pnpm dev     # Start all services
```

Services:
- **API** — `http://localhost:3000`
- **Web Dashboard** — `http://localhost:3001`
- **MCP Server** — `http://localhost:3000/mcp`
