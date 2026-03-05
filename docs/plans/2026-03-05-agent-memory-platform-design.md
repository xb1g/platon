# Agent Memory Platform Design

**Date:** 2026-03-05

## Summary

Build a developer-facing memory platform for AI agent businesses. Agents send a structured session dump after finishing a task. The platform reflects on the run, identifies what went well and what went wrong, stores the result as linked graph memory, and makes that memory retrievable for future agents through MCP and API.

The first version is a memory layer, not a full agent runtime. The product wins if it helps developers make agents less forgetful, less repetitive, and easier to improve over time.

## Product Thesis

Most agents start each session with weak historical context. They may have prompts, local state, or a static `AGENTS.md`, but they do not reliably learn from prior runs. This creates repeated failures, wasted tokens, duplicated debugging, and poor business outcomes.

The platform solves that by converting execution history into reusable operational memory:

- Agents dump structured run data at the end of work
- The platform reflects on the session and extracts lessons
- Lessons are stored in a graph with provenance and confidence
- Future agents retrieve the most relevant prior experience before or during work

## Target User

Primary user:
- Developers building new agent businesses

Secondary user:
- Technical operators who review agent quality, memory quality, and failure trends

## Jobs To Be Done

- "When my agent finishes a task, I want to persist what happened in a reusable format."
- "When my agent starts new work, I want it to quickly retrieve the best prior context."
- "When my agents fail repeatedly, I want to see the pattern and fix the root cause."
- "When I monetize my agents, I want memory access and usage metered cleanly."

## Core Product Capabilities

### 1. Session Ingestion

Agents submit a final run payload through MCP or API. Each session includes:

- agent identity
- tenant or project identity
- task description
- input context summary
- tools used
- steps taken
- outputs and artifacts
- errors and exceptions
- outcome status
- optional human feedback

### 2. Reflection Engine

After ingestion, the system generates structured reflection:

- what went well
- what went wrong
- likely causes of failure
- reusable tactics
- suggested memory entries
- confidence score
- source provenance

Reflection should run asynchronously so ingestion stays fast.

### 3. Graph Memory

Store memory as linked entities rather than flat summaries. The graph should model:

- agents
- sessions
- tasks
- tools
- prompts
- artifacts
- failures
- fixes
- outcomes
- learnings

This allows traversal such as:

- similar task -> same tool -> prior failure -> successful fix
- same agent family -> repeated error pattern -> highest-confidence workaround
- tenant -> workflow -> artifacts -> successful completion path

### 4. Retrieval

Expose retrieval through MCP and API. Retrieval combines:

- graph traversal for relational relevance
- semantic search for similar sessions and learnings
- ranker logic for confidence, freshness, and success rate

### 5. Review Dashboard

The dashboard is for developers, not end users. It should let them:

- inspect sessions
- inspect reflection output
- inspect memory links
- review failure clusters
- approve or reject learnings later if needed

### 6. Monetization

Use Nevermined as the payment layer for MCP and API access:

- plan-based access
- credit usage
- paywall on protected endpoints
- usage metadata synced to billing records

## Architecture

### Logical Components

1. `mcp-server`
Receives MCP tool calls for session dump and memory retrieval.

2. `api-server`
Receives REST requests for ingestion, retrieval, dashboard, auth, and tenant management.

3. `worker`
Processes reflection jobs, embedding jobs, graph write jobs, and ranking jobs.

4. `graph-store`
Neo4j stores sessions, entities, and relationships.

5. `metadata-store`
Postgres stores tenants, users, API keys, billing metadata, audit logs, and session indexes.

6. `vector-store`
Use `pgvector` in Postgres for MVP so semantic search does not require another service.

7. `cache-and-queue`
Redis handles job queues and short-lived cache entries.

8. `web-dashboard`
Next.js frontend for developer operations and debugging.

9. `payments-layer`
Nevermined guards MCP and API access for paid usage.

### Recommended Tech Stack

- Frontend: `Next.js`
- Backend: `TypeScript`, `Node.js`, `Fastify` or `NestJS`
- MCP: TypeScript MCP server
- Graph: `Neo4j`
- Relational + vector: `Postgres` + `pgvector`
- Queue/cache: `Redis` + `BullMQ`
- Background processing: Node worker
- Auth: JWT/OAuth layer backed by Postgres
- Payments: Nevermined
- Infra: Docker, Docker Compose for local, managed cloud for prod

## Data Model

### Primary Entities

- `Tenant`
- `Agent`
- `Session`
- `Task`
- `ToolInvocation`
- `Artifact`
- `Failure`
- `SuccessPattern`
- `Learning`
- `Reflection`

### Example Relationships

- `AGENT_RAN` -> `SESSION`
- `SESSION_FOR` -> `TASK`
- `SESSION_USED` -> `TOOL`
- `SESSION_CREATED` -> `ARTIFACT`
- `SESSION_HAD` -> `FAILURE`
- `FAILURE_RESOLVED_BY` -> `LEARNING`
- `LEARNING_APPLIES_TO` -> `TASK`
- `LEARNING_DERIVED_FROM` -> `SESSION`

## API and MCP Surface

### Core Write Operations

- `POST /sessions`
- `POST /sessions/:id/reflections/recompute`
- `POST /feedback`

### Core Read Operations

- `GET /sessions/:id`
- `GET /agents/:id/memory`
- `POST /retrieve`
- `GET /learnings/:id`

### MCP Tools

- `memory.dump_session`
- `memory.retrieve_context`
- `memory.get_similar_failures`
- `memory.get_success_patterns`

## MVP Scope

### In Scope

- Session ingestion API
- Async reflection pipeline
- Graph storage for sessions and learnings
- Semantic + graph retrieval
- Developer dashboard for session review
- Basic tenant model
- Basic auth and API keys
- Nevermined integration for paid MCP/API access
- Dockerized local environment
- Managed deployment for staging or production

### Out of Scope

- Full agent orchestration runtime
- Multi-region infra
- Fine-grained human approval flows
- Advanced memory editing UI
- Automatic prompt rewriting
- Enterprise RBAC

## Non-Functional Requirements

- Session ingestion should be fast and mostly non-blocking
- Reflection must preserve provenance to the original session
- Memory retrieval should return ranked results with reasons
- Memory entries need confidence, freshness, and tenant isolation
- Every write and retrieval should be auditable

## Key Risks

### 1. Low-quality reflection

Poor reflections create noisy memory that pollutes future retrieval.

Mitigation:
- confidence scores
- provenance links
- memory expiry rules
- later human review hooks

### 2. Weak graph value

If the graph does not outperform plain semantic search, the architecture will feel overbuilt.

Mitigation:
- benchmark graph + vector against vector-only retrieval
- focus schema on causal relationships, not generic entity dumping

### 3. Broad positioning

"Memory for any agent" is wide and can become vague.

Mitigation:
- message the product as infrastructure for developers building agent businesses
- launch around the post-run learning wedge first

## Deployment Recommendation

Use Docker as the standard packaging format. For MVP deployment:

- Docker Compose for local development
- Vercel for the dashboard
- Managed app platform for API, MCP server, and worker
- Managed Postgres
- Neo4j Aura
- Managed Redis

Do not start with Kubernetes unless early customer requirements force isolation or scale needs.

## Success Metrics

- percentage reduction in repeated agent failures
- retrieval usage rate per agent run
- percent of sessions producing reusable learnings
- developer retention and paid conversion
- latency for session ingestion and retrieval

## Phased Rollout

### Phase 1

Session ingestion, reflection, graph write, basic retrieval, local Docker setup

### Phase 2

Dashboard, tenant auth, usage metering, Nevermined integration

### Phase 3

Memory quality scoring, approvals, richer ranking, analytics
