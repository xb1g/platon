# Claude Hooks Adapter for Platon (Optional)

This is an **optional convenience adapter** that wires Claude Code hooks to Platon's memory API. The core architecture is provider-neutral; HTTP and MCP are co-equal interfaces. Use this adapter only if you want automatic context retrieval at session start and session dumps when Claude stops.

## Overview

- **SessionStart**: Retrieves relevant context from Platon and injects it as `additionalContext` for Claude.
- **Stop**: Builds a structured session dump payload from the hook input and POSTs it to the Platon sessions API.

## Opt-in Configuration

All behavior is gated by environment variables. Nothing runs unless you explicitly enable it.

| Variable | Required | Description |
|----------|----------|-------------|
| `PLATON_HOOKS_ENABLED` | Yes | Set to `1` to enable the adapter |
| `PLATON_AGENT_ID` | No | Agent identifier (default: `claude-code`) |
| `PLATON_AGENT_KIND` | No | Agent kind (default: `codex`) |
| `PLATON_API_URL` | No | API base URL (default: `https://platon.bigf.me/api`) |
| `PLATON_RETRIEVE_QUERY` | No | Query for SessionStart retrieval (default: `recent context`) |
| `PLATON_LOCAL_DEV_SUBSCRIBER_ID` | No | Local dev subscriber (skips payment) |
| `PLATON_SUBSCRIBER_ID` | No | Subscriber ID when not in local dev |
| `PLATON_PAYMENT_TOKEN` | No | x402 payment token for paid API calls |
| `PLATON_HOOKS_VERBOSE` | No | Set to `1` for dump confirmation logs |

## Setup

1. Add to `.claude/settings.json` (or `~/.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx tsx $CLAUDE_PROJECT_DIR/apps/mcp/examples/claude-hooks/session-start.ts"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx tsx $CLAUDE_PROJECT_DIR/apps/mcp/examples/claude-hooks/stop.ts"
          }
        ]
      }
    ]
  }
}
```

2. Set `PLATON_HOOKS_ENABLED=1` in your environment or `.claude/settings.local.json` (via env vars if supported).

3. Configure `PLATON_AGENT_ID`, `PLATON_AGENT_KIND`, and auth (subscriber ID or payment token) as needed.

## Payload Contract

The adapter uses the canonical shared contract:

- **Retrieve**: `{ agentId, agentKind, query, limit, filters }`
- **Dump**: `{ agentId, agentKind, sessionId, task, outcome, tools, events, artifacts, errors }`

See `agent.md` and `packages/shared/src/session.ts` for the full schema.

## Alternatives

- **MCP**: Connect the Platon MCP server and call `memory.retrieve_context` and `memory.dump_session` explicitly.
- **HTTP**: Call the REST API directly from your own scripts.
- **Manual**: Use the tools only when you choose; no hooks required.
