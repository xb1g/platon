# Nevermined x402 Flow

This runbook covers the first paid subscriber flow for the Platon memory API and MCP surface.

## Builder Setup

1. Create a Nevermined API key and set `NVM_API_KEY`.
2. Set `NVM_ENVIRONMENT`, `BUILDER_ADDRESS`, and `API_PUBLIC_URL` in the repo root `.env`.
3. Register the API agent and credit plan:

```bash
pnpm --filter @memory/api register:nevermined
```

4. Copy the printed `NVM_AGENT_ID` and `NVM_PLAN_ID` values into the repo root `.env`.

## Subscriber Flow

1. Order the plan for the target subscriber account.
2. Acquire an x402 access token for the registered agent and plan.
3. Call the protected API or MCP endpoint without a token once to inspect the `payment-required` header if needed.
4. Retry with the `payment-signature` header set to the x402 access token.
5. On success, inspect the `payment-response` header for settlement metadata.

## Example API Calls

Request payment requirements:

```bash
curl -i http://localhost:3001/retrieve \
  -X POST \
  -H 'content-type: application/json' \
  -d '{"agentId":"agent-123","agentKind":"support-agent","query":"find similar failures"}'
```

Call with an x402 access token:

```bash
curl -i http://localhost:3001/retrieve \
  -X POST \
  -H 'content-type: application/json' \
  -H "payment-signature: $X402_ACCESS_TOKEN" \
  -d '{"agentId":"agent-123","agentKind":"support-agent","query":"find similar failures"}'
```

## Example MCP Flow

1. Discover the MCP tool catalog.
2. Receive `payment-required` metadata for a protected tool invocation.
3. Acquire an x402 token for the same `NVM_PLAN_ID` and `NVM_AGENT_ID`.
4. Retry the MCP tool call with the token attached in the transport headers.

The runtime identity for both API and MCP requests is derived from the verified Nevermined subscriber context, not from caller-supplied tenant identifiers.
