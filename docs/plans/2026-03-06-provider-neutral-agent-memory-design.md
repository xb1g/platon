# Provider-Neutral Agent Memory Design

**Date:** 2026-03-06

## Goal

Finish the missing live ingestion path so any agent runtime can explicitly retrieve context and dump completed sessions through either HTTP or MCP, with durable raw storage in Postgres and asynchronous reflection into Neo4j.

## Scope

This design covers:

- Canonical shared contract for retrieval and session dump
- API ingestion path from `POST /sessions` to Postgres and BullMQ
- Worker reflection path from BullMQ to Neo4j
- Provider-neutral adapter model for MCP, Claude Hooks, Codex, Cursor, and direct HTTP clients
- Documentation and rule updates to remove contract drift
- End-to-end verification strategy

This design does not require:

- Always-on automatic dumping for every agent
- A provider-specific SDK as the only integration path
- Production x402 changes beyond preserving the existing auth boundary

## Product Decisions

- Retrieval and dump remain explicit actions that the agent or user config decides to call.
- HTTP and MCP are co-equal front doors over the same shared contract.
- Provider-specific automation is optional convenience, not part of the core correctness path.
- Raw session persistence happens before reflection, so no run is lost if the worker is down.
- Reflection and graph writes happen asynchronously in the worker only.

## Canonical Contract

The canonical session dump shape is the shared schema in `packages/shared/src/session.ts`.

Required fields:

- `agentKind`
- `agentId`
- `sessionId`
- `task`
- `outcome`

Optional fields:

- `tenantId`
- `inputContextSummary`
- `tools`
- `events`
- `artifacts`
- `errors`
- `humanFeedback`

Both HTTP and MCP must accept and document the same payload shape. No adapter may introduce an alternate `content` blob format.

## Architecture

### Shared contract

`packages/shared` remains the source of truth for request validation and cross-service types.

### Ingestion path

`POST /sessions` becomes a synchronous ingest boundary:

1. Validate payload.
2. Resolve namespace identity from auth/subscriber context plus `agentKind` and `agentId`.
3. Persist the raw session row in Postgres.
4. Enqueue a `reflect-session` BullMQ job.
5. Return the stored row id and reflection status.

### Reflection path

The worker consumes `reflect-session` jobs:

1. Load the raw session from Postgres using the stored id.
2. Run LLM reflection.
3. Write namespace-scoped sessions and learnings to Neo4j.
4. Update Postgres reflection status and timestamps.

### Adapter model

- HTTP clients call the API directly.
- MCP is a thin bridge over the same API contract.
- Claude Hooks, Codex instructions, Cursor rules, and future adapters gather local context and call the same HTTP or MCP contract.

## Data Model

Add a durable Postgres table for raw session storage. Recommended columns:

- `id`
- `subscriber_id`
- `agent_kind`
- `agent_id`
- `session_id`
- `task_kind`
- `task_summary`
- `outcome_status`
- `outcome_summary`
- `input_context_summary`
- `payload_json`
- `reflection_status`
- `reflection_enqueued_at`
- `reflection_completed_at`
- `reflection_error`
- `created_at`
- `updated_at`

Recommended uniqueness:

- `(subscriber_id, agent_kind, agent_id, session_id)`

Recommended reflection states:

- `queued`
- `processing`
- `completed`
- `failed`
- `pending_retry`

## Service Boundaries

### API

The API owns:

- request validation
- namespace resolution
- raw Postgres persistence
- queue publish
- ingestion response shape

### Worker

The worker owns:

- loading durable session input
- reflection generation
- Neo4j writes
- reflection status transitions

### MCP

The MCP server owns:

- payment verification
- namespace-aware tool inputs
- forwarding calls to the API

It does not own persistence rules or alternate payload contracts.

## Failure Handling

- If validation fails, return `400`.
- If Postgres insert fails, return `500` and enqueue nothing.
- If Postgres insert succeeds but queue publish fails, keep the stored row and mark `reflection_status = pending_retry`.
- If worker reflection fails, keep the raw session and set `reflection_status = failed` with an error message.
- Neo4j write failure must not delete the durable raw session.

## Provider-Neutral Integration

The default integration pattern is explicit and manual-first:

- before a task, optionally call retrieval
- after a task, optionally call dump

Optional adapters may automate those steps when a provider offers hooks, but the platform stays provider-neutral because:

- the contract is shared
- the automation is opt-in
- any runtime can use HTTP or MCP

Claude-specific hooks are documented as one adapter example:

- `SessionStart` for optional retrieval and extra context injection
- `Stop` for optional task-end dump
- `SessionEnd` only for non-critical cleanup or telemetry

## Docs To Update

These files currently drift from the real contract and must be aligned:

- `.cursor/rules/platon-agent.mdc`
- `agent.md`
- `apps/web/docs/INTEGRATION.md`
- `apps/web/app/(marketing)/page.tsx`

## Verification

The system is only complete when one real session dump can be traced end-to-end:

1. `memory.dump_session` or direct HTTP call succeeds.
2. Postgres stores the raw session.
3. BullMQ receives the reflection job.
4. Worker processes the job.
5. Neo4j stores the namespace-scoped session and learning nodes.
6. Postgres status reflects completion.

## Success Criteria

- A normal `dump_session` call persists a durable raw session row.
- The API enqueues a reflection job without returning a mock id.
- The worker reflects that stored session and writes to Neo4j.
- HTTP and MCP share the same request contract.
- Docs and agent rules show the current structured payload, not `content`.
- Claude Hooks are documented as optional adapters, not as the core architecture.
