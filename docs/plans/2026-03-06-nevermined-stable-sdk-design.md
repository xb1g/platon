# Nevermined Stable SDK Hardening Design

## Goal

Bring Platon's Nevermined integration onto the current stable SDK line and align the runtime contract with what the SDK actually verifies.

## Public Surface

- HTTP API:
  - `POST /sessions`
  - `POST /retrieve`
  - `GET /health`
  - `GET /openapi.json`
- MCP transport:
  - `POST /mcp`
  - `GET /mcp`
  - `DELETE /mcp`
- MCP tools:
  - `memory.dump_session`
  - `memory.retrieve_context`
  - `memory.get_similar_failures`

## Payment Model

- Protocol: x402 v2
- Scheme: `nvm:erc4337`
- Sandbox network: `eip155:84532`
- Live network: `eip155:8453`
- Request header: `payment-signature`
- Challenge header: `payment-required`
- Settlement header: `payment-response`

## Design Decisions

1. Upgrade `@nevermined-io/payments` to stable `1.1.6`.
2. Use facilitator verification and settlement on the HTTP API boundary because the legacy request-tracking methods are no longer part of the stable typed SDK.
3. Treat Nevermined as the verifier of subscriber identity, not app-level agent scope.
4. Keep `agentId` and `agentKind` in the request payload as application namespace selectors inside the verified subscriber namespace.
5. Expose a machine-readable OpenAPI definition at `GET /openapi.json` and use that as `agentDefinitionUrl` during Nevermined registration.
6. Add a smoke verification script that always checks the `402` preflight and optionally performs a full paid retry when subscriber credentials are available.

## Verification Target

- `pnpm --filter @memory/api typecheck`
- `pnpm --filter @memory/mcp typecheck`
- `pnpm --filter @memory/api test`
- `pnpm --filter @memory/mcp test`
- `pnpm --filter @memory/api verify:nevermined`
