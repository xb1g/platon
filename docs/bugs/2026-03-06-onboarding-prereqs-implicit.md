# Bug: Paid MCP startup/onboarding prerequisites are under-documented for first-run agents

## Summary
Successful onboarding requires multiple runtime secrets and stable identities, but the requirements are not all surfaced as a single, enforced setup path in the runtime flow.

## Severity
Medium

## Impact
External operators can install against docs but still hit startup/auth runtime errors before first successful call.

## Evidence and Reproduction
- MCP server startup requires `NVM_API_KEY` and `PLATON_INTERNAL_AUTH_TOKEN` internally (throws if missing).
  - [apps/mcp/src/server.ts](file:///Users/bunyasit/dev/platon/apps/mcp/src/server.ts):89-111
- `Authorization` token is required on MCP transport, not as tool args; this can be missed by callers expecting in-tool auth.
  - [apps/mcp/src/tools/get-similar-failures.ts](file:///Users/bunyasit/dev/platon/apps/mcp/src/tools/get-similar-failures.ts):7-10
  - [apps/mcp/src/tools/dump-session.ts](file:///Users/bunyasit/dev/platon/apps/mcp/src/tools/dump-session.ts):34-37
  - [apps/mcp/src/tools/retrieve-context.ts](file:///Users/bunyasit/dev/platon/apps/mcp/src/tools/retrieve-context.ts):7-12
- Runtime examples mention token mechanics, but the initial transport contract (`Accept` header + token placement + env checks) is currently spread across docs + implementation details.
  - [apps/web/docs/INTEGRATION.md](file:///Users/bunyasit/dev/platon/apps/web/docs/INTEGRATION.md)
  - [agent.md](file:///Users/bunyasit/dev/platon/agent.md)

## Root cause
No single bootstrap contract validates all prerequisites up front or documents the complete operator-required matrix in one place.

## Suggested fix
1. Add a `platon-mcp doctor`-style startup check that validates required env and prints a concrete first-call recipe.
2. Add a small runbook section: "Copy this exact request profile for first successful `initialize` + `retrieve_context` + `dump_session`."
3. Add installation tests that fail fast if required env/signature prerequisites are missing.
