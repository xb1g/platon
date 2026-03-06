# Platon Integration Guide

Add persistent memory to your AI agents in minutes.

---

## Quick Start

### Option 1: MCP Server (Recommended)

Add Platon to your agent's MCP configuration:

```json
{
  "mcpServers": {
    "platon": {
      "command": "npx",
      "args": ["-y", "@platon/mcp-server"],
      "env": {
        "PLATON_API_KEY": "your-api-key"
      }
    }
  }
}
```

Your agent now has access to three tools:

| Tool | Description |
|------|-------------|
| `memory.dump_session` | Persist a session for reflection and learning |
| `memory.retrieve_context` | Query relevant memories before a task |
| `memory.get_similar_failures` | Find similar past failures to avoid |

### Option 2: REST API

```bash
curl -X POST https://api.platon.dev/sessions \
  -H "Authorization: Bearer $PLATON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant",
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
{ "id": "sess-xxx", "status": "queued", "tenantId": "your-tenant" }
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

Persist a completed session for reflection. Use the same structured payload as the HTTP API.

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
| `PLATON_API_KEY` | Your API key (required) |
| `PLATON_API_URL` | API base URL (default: `https://api.platon.dev`) |

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
- **MCP Server** — stdio transport (configure in your agent)
