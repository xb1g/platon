# Nevermined-Paid MCP Design

**Date:** 2026-03-06

## Goal

Monetize the Platon MCP server directly with Nevermined x402 so MCP tool calls are paid at the MCP layer, rather than relying on custom token verification in the server implementation.

## Decisions

- The MCP server in `apps/mcp` becomes a native Nevermined-paid MCP server.
- The priced tools are:
  - `memory.dump_session`
  - `memory.retrieve_context`
  - `memory.get_similar_failures`
- Each tool costs `1` credit per invocation.
- The default commercial configuration is:
  - environment: `sandbox`
  - plan name: `Platon MCP Starter`
  - credits per plan: `100`
  - price: `10 USDC`
- HTTP API monetization remains separate; this change makes MCP itself a paid surface.

## Architecture

The current MCP server does two payment-specific things that should be removed:

- it requires `paymentToken` in the MCP tool arguments
- it verifies tokens in custom server code before forwarding to the HTTP API

Instead:

- the MCP server should use Nevermined's MCP integration to register paid tools
- payment auth should be handled by the Nevermined MCP layer
- tool handlers should stay focused on business logic and forwarding payloads to the API

## Runtime Behavior

For unpaid callers:

- the MCP layer returns payment-required behavior
- the caller obtains an x402 access token for the plan and agent
- the caller retries the MCP call with the token in transport headers

For paid callers:

- the MCP layer verifies access
- the tool handler executes
- credits are redeemed automatically

## Contract Changes

- Remove `paymentToken` from MCP tool input schemas.
- Preserve the current structured payload contract for `memory.dump_session`.
- Preserve namespace-aware inputs such as `agentKind` and `agentId`.
- Keep local development bypass support only if it remains compatible with the native Nevermined MCP runtime. If it conflicts, prefer the native path and update docs accordingly.

## Code Areas

- `apps/mcp/src/server.ts`
- `apps/mcp/src/tools/dump-session.ts`
- `apps/mcp/src/tools/retrieve-context.ts`
- `apps/mcp/src/tools/get-similar-failures.ts`
- `apps/mcp/tests/server.test.ts`
- `apps/web/docs/INTEGRATION.md`
- `agent.md`
- `README.md`

## Success Criteria

- MCP server no longer uses custom `verifyPayment` logic.
- MCP tools are registered through Nevermined MCP paywall integration.
- MCP callers are monetized with `1` credit per tool call.
- Tool schemas no longer require `paymentToken` as an argument.
- Tests prove unpaid calls are rejected by the MCP paywall surface and paid calls execute handler logic.
