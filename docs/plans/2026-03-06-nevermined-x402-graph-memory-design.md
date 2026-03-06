# Nevermined x402 Graph Memory Design

**Date:** 2026-03-06

## Summary

Build the first usable version of the platform around Nevermined x402 as the external access mechanism for both HTTP and MCP. Users and user-controlled agents should not need a platform-issued API key for normal operation. Instead, subscriber agents obtain x402 access tokens from Nevermined, call the protected memory endpoints directly, and the platform derives request identity from payment verification.

The platform stores memory in Neo4j with strict namespace isolation. The memory boundary is:

- `subscriberId`
- `agentKind`
- `agentId`

Every memory write and read must resolve through that namespace first.

## Chosen Approach

### Authentication and Payment

Use Nevermined as the user-facing auth and billing layer.

- Builder side:
  The platform uses its own `NVM_API_KEY` to register agents and payment plans.
- Subscriber side:
  Customer-owned agents subscribe to the plan and programmatically fetch x402 access tokens with their own Nevermined subscriber credentials.
- Request side:
  Subscriber agents call the platform with `payment-signature`.
- Verification side:
  The platform verifies the token and derives a stable subscriber identity from Nevermined verification and settlement metadata.

This removes the need to issue or manage platform API keys for the normal paid path.

### Protocol Surface

Support both:

- HTTP API for direct agent integrations
- MCP server for agent ecosystems that already speak MCP

The HTTP API and MCP layer should share the same underlying request context model and memory namespace rules.

## Why This Approach

This is the least stateful design that matches the current repo and the MCP example in `/Users/bunyasit/dev/hackathons/agents/mcp-server-agent`.

It avoids three problems:

- building a second customer auth system that overlaps with Nevermined
- storing subscriber secrets on the platform just to broker tokens
- trying to retrofit tenant-style isolation after memory is already written

## Architecture

### Runtime Components

1. `apps/api`
   Owns HTTP ingestion and retrieval routes, Nevermined verification, namespace resolution, and graph queries.

2. `apps/mcp`
   Owns MCP tools for `memory.dump_session`, `memory.retrieve_context`, and `memory.get_similar_failures`, backed by the same API/service layer and the same x402-derived auth context.

3. `apps/worker`
   Owns async reflection, learning extraction, and graph writes that happen after raw session ingestion.

4. `Neo4j`
   Primary memory store for namespaces, sessions, learnings, tools, artifacts, and graph traversal.

5. `Postgres`
   Secondary store for raw session payloads, audit records, queued job metadata, and optional denormalized reporting views.

6. `Redis`
   Queue and short-lived cache.

### Request Flow

1. Subscriber agent purchases or already has the Nevermined plan.
2. Subscriber agent gets an x402 access token for the target agent.
3. Subscriber agent calls HTTP or MCP endpoint with `payment-signature`.
4. Platform verifies the token and attaches request auth context.
5. Platform resolves or creates the `MemoryNamespace`.
6. Platform executes the request.
7. Platform settles credits only on success.

## Identity Model

The old `tenantId` placeholder should stop being the primary isolation mechanism for paid runtime traffic.

The runtime identity model should be:

- `subscriberId`: canonical identity derived from Nevermined verification
- `agentKind`: logical class such as `coder`, `researcher`, `support`, `ops`
- `agentId`: exact concrete agent instance or registered agent target

Optional internal tenant/account concepts can still exist for dashboard administration, but retrieval and write isolation must use the namespace triple above.

## Graph Data Model

### Core Nodes

- `(:Subscriber { subscriberId, walletAddress, planId })`
- `(:AgentKind { key })`
- `(:Agent { agentId, kind, planId, name })`
- `(:MemoryNamespace { namespaceId, subscriberId, agentKind, agentId, createdAt })`
- `(:Session { sessionId, status, taskKind, summary, createdAt, updatedAt })`
- `(:Learning { learningId, type, summary, confidence, createdAt })`
- `(:Tool { name, category })`
- `(:Artifact { artifactId, kind, uri, summary })`
- `(:FailurePattern { patternId, summary, confidence })`
- `(:SuccessPattern { patternId, summary, confidence })`

### Core Relationships

- `(:Subscriber)-[:OWNS_NAMESPACE]->(:MemoryNamespace)`
- `(:AgentKind)-[:HAS_AGENT]->(:Agent)`
- `(:Agent)-[:USES_NAMESPACE]->(:MemoryNamespace)`
- `(:MemoryNamespace)-[:CONTAINS_SESSION]->(:Session)`
- `(:Session)-[:YIELDED]->(:Learning)`
- `(:Session)-[:USED_TOOL]->(:Tool)`
- `(:Session)-[:PRODUCED]->(:Artifact)`
- `(:Session)-[:MATCHED_FAILURE]->(:FailurePattern)`
- `(:Session)-[:MATCHED_SUCCESS]->(:SuccessPattern)`
- `(:Learning)-[:RELATES_TO]->(:Tool|:Artifact|:FailurePattern|:SuccessPattern)`

### Hard Rule

No retrieval query may start from `Session`, `Learning`, or `FailurePattern` directly. Every query must first bind:

```cypher
MATCH (ns:MemoryNamespace {
  subscriberId: $subscriberId,
  agentKind: $agentKind,
  agentId: $agentId
})
```

and only then traverse outward.

This should be treated as a security boundary, not a query convenience.

## API Surface

### Required HTTP Endpoints

- `POST /sessions`
  Accepts session payloads for the verified namespace.
- `POST /retrieve`
  Returns ranked memory results within the verified namespace.
- `GET /billing/credits`
  Returns current subscriber balance if available from Nevermined or cached settlement metadata.
- `GET /health`
  Public health endpoint.

### Auth Context

After verification, request handlers should receive:

- `subscriberId`
- `agentId`
- `agentKind`
- `planId`
- `paymentToken`
- `agentRequestId`
- `creditsToRedeem`

The request body must not be trusted as the source of subscriber identity.

## MCP Surface

### Required Tools

- `memory.dump_session`
- `memory.retrieve_context`
- `memory.get_similar_failures`

For v1, the MCP implementation can be a thin wrapper over shared service functions or the HTTP API, but it must not bypass namespace enforcement.

## Session and Retrieval Semantics

### Ingestion

`POST /sessions` should:

1. validate payload
2. resolve namespace from auth context plus payload `agentKind`
3. persist raw session metadata
4. enqueue reflection
5. return a queued session record

### Retrieval

`POST /retrieve` should:

1. validate payload
2. resolve namespace from auth context plus payload `agentKind` and `agentId`
3. run graph traversal only within namespace
4. optionally merge vector hits from namespace-scoped indexed content
5. rank results by confidence, freshness, and outcome quality

## Error Handling

### Payment Errors

- Missing token: `402` with `payment-required`
- Invalid token: `401` or `402` depending on Nevermined verification semantics used in implementation
- Insufficient balance: `402`
- Wrong endpoint or wrong agent authorization: `403`

### Data Errors

- Invalid payload: `400`
- Namespace mismatch between token-derived agent and body: `403`
- Graph/write failure before settlement: `500`, no settlement
- Worker failure after accepted ingest: session remains persisted with async failure state

## Testing Strategy

### API

Cover:

- public health route remains open
- protected routes return `402` when no token is present
- successful paid requests redeem credits once
- namespace resolution uses verified auth context
- cross-namespace reads return nothing

### Graph

Cover:

- sessions are written under the correct namespace
- retrieval cannot escape namespace boundaries
- same subscriber with different `agentKind` values gets separate memory
- same subscriber and `agentKind` with different `agentId` values gets separate memory

### MCP

Cover:

- tool listing
- tool call failure without auth
- tool call success with valid x402 token
- MCP retrieval respects the same namespace constraints as HTTP

## Non-Goals For This Slice

- platform-issued customer API keys as the primary auth mechanism
- human checkout flows in the request loop
- token brokering by the platform on behalf of subscribers
- multi-plan enterprise entitlement models

## Rollout Order

1. Replace mock auth assumptions with x402-derived runtime auth context.
2. Introduce `MemoryNamespace` and move graph access behind it.
3. Wire session ingestion and retrieval to namespace-aware graph queries.
4. Adapt MCP tools to the same service layer.
5. Add registration/setup scripts and docs for builder and subscriber flows.
