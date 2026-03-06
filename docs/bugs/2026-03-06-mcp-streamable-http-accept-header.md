# Bug: Remote MCP onboarding omits the required StreamableHTTP `Accept` header contract

## Summary
Production MCP endpoint `https://platon.bigf.me/mcp` returns `406 Not Acceptable` when a caller attempts remote MCP without `Accept: application/json, text/event-stream`.

That response is consistent with the StreamableHTTP transport, but the contract is not spelled out in the canonical installation flow. As a result, first-run remote MCP connectivity is brittle for clients that support MCP but do not set the required `Accept` header by default.

## Severity
Medium

## Impact
Remote MCP onboarding can fail before auth and tool behavior are validated.

This is primarily a documentation gap, not a protocol bug:

- Runtimes that support remote MCP need an explicit StreamableHTTP request profile.
- Runtimes that do not support MCP should use the direct HTTP API instead of posting JSON-RPC to `/mcp`.

## Evidence and Reproduction
- `POST https://platon.bigf.me/mcp` with a JSON-RPC body and no `Accept` header returned:
  - `HTTP/1.1 406 Not Acceptable`
- With `Accept: application/json, text/event-stream`:
  - `initialize` succeeds.
  - `tools/list` succeeds.
  - `tools/call` without auth returns `Authorization required`.
  - `tools/call` with an invalid bearer token returns a payment-required response.

## Root Cause
- The MCP route delegates directly to `StreamableHTTPServerTransport`, so the transport contract is enforced exactly as implemented:
  - `apps/mcp/src/server.ts`
- The canonical install contract exposes the MCP endpoint and bearer-token placement, but it does not currently show the required remote MCP `Accept` header or a concrete first-call example:
  - `apps/web/lib/agent-installation.ts`
  - `apps/web/docs/INTEGRATION.md`

## Suggested Fix
1. Add an explicit "Remote MCP request contract" section to `apps/web/lib/agent-installation.ts` so the hosted `/agent-installation.md` document includes:
   - `Accept: application/json, text/event-stream`
   - `Authorization: Bearer <x402-access-token>`
   - a minimal `initialize` example
2. Mirror that guidance in `apps/web/docs/INTEGRATION.md` for local-development and self-hosting readers.
3. Add a smoke test that exercises `initialize` and `tools/list` with the supported headers so the documented transport contract stays accurate.
