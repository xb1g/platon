# Nevermined Setup

## Prerequisites

- A [Nevermined](https://nevermined.app) account with an API key.
- A builder wallet address to receive plan revenue.

## Environment Variables

Add the following to your `.env` file (see `.env.example` for a template):

```
NVM_API_KEY=sandbox:your-api-key
NVM_ENVIRONMENT=sandbox
NVM_PLAN_ID=your-plan-id-here
NVM_AGENT_ID=your-agent-id-here
BUILDER_ADDRESS=0xYourWalletAddress
API_PUBLIC_URL=http://localhost:3001
PLATON_INTERNAL_AUTH_TOKEN=a-long-random-secret
```

## Register the Agent and Credit Plan

Once the environment variables above are set, run the registration script:

```bash
pnpm --filter @memory/api register:nevermined
```

The script prints the generated `NVM_AGENT_ID` and `NVM_PLAN_ID`. Copy those values
back into `.env`.

## Testing the Paywall

The paid public HTTP surface currently exposed to Nevermined is:

- `POST /sessions`
- `POST /retrieve`

The MCP transport is exposed separately at `POST /mcp`, with paid tools registered on top of that transport.

The runtime payment flow uses x402 v2 with:

- scheme: `nvm:erc4337`
- sandbox network: `eip155:84532`
- live network: `eip155:8453`
- request header: `payment-signature`
- challenge header: `payment-required`
- settlement header: `payment-response`

Call a protected endpoint without a token to see the `payment-required` header:

```bash
curl -i http://localhost:3001/sessions \
  -X POST \
  -H 'content-type: application/json' \
  -d '{"agentId":"agent-1","agentKind":"support-agent","sessionId":"s-1","task":{"kind":"debug","summary":"test"},"outcome":{"status":"success","summary":"ok"}}'
```

Then acquire an x402 access token and retry:

```bash
curl -i http://localhost:3001/retrieve \
  -X POST \
  -H 'content-type: application/json' \
  -H "payment-signature: $X402_ACCESS_TOKEN" \
  -d '{"agentId":"agent-1","agentKind":"support-agent","query":"similar failures"}'
```

Refer to [nevermined-x402-flow.md](./nevermined-x402-flow.md) for the complete
subscriber flow.

For an automated local verification, run:

```bash
pnpm --filter @memory/api verify:nevermined
```

This first verifies `GET /nevermined.json`, then verifies the `402` preflight against `POST /retrieve`. If `NVM_SUBSCRIBER_API_KEY` is set, it also attempts a paid retry using a fresh x402 access token.
