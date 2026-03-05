# Agent Memory Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MVP of a developer-facing agent memory platform that accepts session dumps, reflects on outcomes, stores reusable memory in a graph, retrieves relevant prior experience, and monetizes access through Nevermined.

**Architecture:** The system is split into a web dashboard, API server, MCP server, background worker, Postgres metadata store, Neo4j graph store, Redis queue, and shared packages for schemas and clients. The MVP is containerized with Docker Compose locally and designed for managed deployment in production.

**Tech Stack:** Next.js, TypeScript, Node.js, Fastify, MCP server, BullMQ, Redis, Postgres, pgvector, Neo4j, Docker Compose, Nevermined

---

### Task 1: Scaffold the monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `apps/api/package.json`
- Create: `apps/mcp/package.json`
- Create: `apps/web/package.json`
- Create: `apps/worker/package.json`
- Create: `packages/shared/package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

**Step 1: Create the workspace files**

Write the root workspace config and empty package manifests for each app and package.

**Step 2: Install dependencies**

Run: `pnpm install`
Expected: workspace lockfile created successfully

**Step 3: Verify workspace resolution**

Run: `pnpm -r exec pwd`
Expected: each workspace resolves without errors

**Step 4: Commit**

```bash
git add .
git commit -m "chore: scaffold monorepo for agent memory platform"
```

### Task 2: Define shared schemas and clients

**Files:**
- Create: `packages/shared/src/session.ts`
- Create: `packages/shared/src/reflection.ts`
- Create: `packages/shared/src/retrieval.ts`
- Create: `packages/shared/src/env.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/session.test.ts`

**Step 1: Write the failing test**

Create schema tests for session payload validation and retrieval request validation.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/shared test`
Expected: FAIL because schemas are not implemented

**Step 3: Write minimal implementation**

Create shared types and schema validators for:
- session ingestion
- reflection result
- retrieval request and response

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/shared test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared schemas for session and retrieval flows"
```

### Task 3: Bring up local infrastructure

**Files:**
- Create: `docker-compose.yml`
- Create: `infra/postgres/init.sql`
- Create: `infra/neo4j/plugins/.gitkeep`
- Create: `infra/redis/.gitkeep`

**Step 1: Write the infrastructure definition**

Define local services for:
- Postgres with pgvector
- Neo4j
- Redis

**Step 2: Start the stack**

Run: `docker compose up -d`
Expected: all services become healthy

**Step 3: Verify service connectivity**

Run: `docker compose ps`
Expected: Postgres, Neo4j, and Redis show running

**Step 4: Commit**

```bash
git add docker-compose.yml infra
git commit -m "chore: add local infrastructure stack"
```

### Task 4: Create the API server

**Files:**
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/routes/sessions.ts`
- Create: `apps/api/src/routes/retrieve.ts`
- Create: `apps/api/src/lib/postgres.ts`
- Create: `apps/api/src/lib/neo4j.ts`
- Create: `apps/api/src/lib/redis.ts`
- Create: `apps/api/tests/sessions.test.ts`
- Create: `apps/api/tests/retrieve.test.ts`

**Step 1: Write the failing tests**

Cover:
- `POST /sessions` accepts valid payloads
- invalid payloads return 400
- `POST /retrieve` returns ranked memory results

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test`
Expected: FAIL because routes do not exist

**Step 3: Write minimal implementation**

Implement:
- Fastify server bootstrap
- request validation with shared schemas
- Postgres persistence for session metadata
- queue enqueue on session ingest
- placeholder retrieval path

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add api server for session ingestion and retrieval"
```

### Task 5: Add the reflection worker

**Files:**
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/src/jobs/reflect-session.ts`
- Create: `apps/worker/src/lib/llm.ts`
- Create: `apps/worker/src/lib/store-reflection.ts`
- Create: `apps/worker/tests/reflect-session.test.ts`

**Step 1: Write the failing test**

Test that a queued session creates:
- reflection output
- graph nodes and relationships
- retrieval index metadata

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/worker test`
Expected: FAIL because worker is not implemented

**Step 3: Write minimal implementation**

Implement the worker that:
- loads session metadata
- generates structured reflection
- writes reflection data to Postgres
- writes entities and edges to Neo4j

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/worker test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/worker
git commit -m "feat: add reflection worker and graph persistence"
```

### Task 6: Implement retrieval ranking

**Files:**
- Modify: `apps/api/src/routes/retrieve.ts`
- Create: `apps/api/src/lib/retrieval/graph-search.ts`
- Create: `apps/api/src/lib/retrieval/vector-search.ts`
- Create: `apps/api/src/lib/retrieval/rank.ts`
- Create: `apps/api/tests/retrieval-ranking.test.ts`

**Step 1: Write the failing test**

Create tests proving retrieval ranks:
- relevant recent successes above stale low-confidence learnings
- exact failure matches above generic semantic matches

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- retrieval-ranking`
Expected: FAIL because ranking logic does not exist

**Step 3: Write minimal implementation**

Implement:
- graph traversal query
- vector similarity query
- rank combiner using confidence, freshness, and success signals

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- retrieval-ranking`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add graph and semantic retrieval ranking"
```

### Task 7: Create the MCP server

**Files:**
- Create: `apps/mcp/src/server.ts`
- Create: `apps/mcp/src/tools/dump-session.ts`
- Create: `apps/mcp/src/tools/retrieve-context.ts`
- Create: `apps/mcp/src/tools/get-similar-failures.ts`
- Create: `apps/mcp/tests/server.test.ts`

**Step 1: Write the failing test**

Cover MCP tools:
- `memory.dump_session`
- `memory.retrieve_context`
- `memory.get_similar_failures`

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test`
Expected: FAIL because the MCP server is not implemented

**Step 3: Write minimal implementation**

Implement MCP tools as thin wrappers around the API server or shared services.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp
git commit -m "feat: add mcp server for memory ingestion and retrieval"
```

### Task 8: Add auth and tenant isolation

**Files:**
- Create: `apps/api/src/plugins/auth.ts`
- Create: `apps/api/src/routes/tenants.ts`
- Modify: `apps/api/src/routes/sessions.ts`
- Modify: `apps/api/src/routes/retrieve.ts`
- Create: `apps/api/tests/auth.test.ts`

**Step 1: Write the failing test**

Cover:
- unauthenticated access rejected
- tenant-scoped data isolation enforced

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- auth`
Expected: FAIL because auth and tenant checks do not exist

**Step 3: Write minimal implementation**

Implement API keys or JWT-based auth with tenant-aware query filters.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- auth`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add auth and tenant isolation"
```

### Task 9: Integrate Nevermined metering

**Files:**
- Create: `apps/api/src/plugins/paywall.ts`
- Modify: `apps/mcp/src/server.ts`
- Create: `apps/api/src/routes/billing.ts`
- Create: `apps/api/tests/paywall.test.ts`
- Update: `.env.example`

**Step 1: Write the failing test**

Cover:
- protected endpoint rejects unpaid requests
- successful request burns credits or records usage

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: FAIL because billing integration does not exist

**Step 3: Write minimal implementation**

Implement Nevermined integration at the API and MCP boundary.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api apps/mcp .env.example
git commit -m "feat: add nevermined paywall and usage metering"
```

### Task 10: Build the developer dashboard

**Files:**
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/sessions/page.tsx`
- Create: `apps/web/app/sessions/[id]/page.tsx`
- Create: `apps/web/app/learnings/page.tsx`
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/tests/sessions-page.test.tsx`

**Step 1: Write the failing test**

Cover:
- session list renders
- session detail shows reflection and linked learnings
- learning list renders ranked memory entries

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/web test`
Expected: FAIL because the UI does not exist

**Step 3: Write minimal implementation**

Implement the dashboard pages with plain but clear views for:
- sessions
- reflections
- graph-linked learnings

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/web test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add developer dashboard for sessions and learnings"
```

### Task 11: Add observability and auditability

**Files:**
- Create: `apps/api/src/plugins/telemetry.ts`
- Create: `apps/worker/src/lib/telemetry.ts`
- Create: `apps/api/src/routes/audit.ts`
- Create: `docs/runbooks/local-dev.md`

**Step 1: Write the failing test**

Test that:
- ingestion and retrieval events are logged
- reflection jobs emit traceable job identifiers

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- telemetry`
Expected: FAIL because telemetry is not implemented

**Step 3: Write minimal implementation**

Add tracing hooks, structured logs, and audit endpoints for key actions.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- telemetry`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api apps/worker docs/runbooks/local-dev.md
git commit -m "chore: add telemetry and audit support"
```

### Task 12: Finalize developer setup and release docs

**Files:**
- Modify: `README.md`
- Create: `docs/runbooks/deploy.md`
- Create: `docs/runbooks/mcp-integration.md`
- Create: `docs/runbooks/nevermined-setup.md`

**Step 1: Write the missing docs**

Document:
- local boot sequence
- environment variables
- MCP integration example
- deployment steps
- Nevermined setup steps

**Step 2: Verify local setup instructions**

Run:
- `docker compose up -d`
- `pnpm dev`

Expected: local app, API, MCP server, and worker start successfully

**Step 3: Sanity-check core flows**

Run:
- session ingestion request
- reflection job
- retrieval request

Expected: session becomes retrievable with linked learning output

**Step 4: Commit**

```bash
git add README.md docs/runbooks
git commit -m "docs: finalize setup and deployment guides"
```

## Milestone Order

1. monorepo and shared schemas
2. local infrastructure
3. API ingestion and worker reflection
4. retrieval and MCP tools
5. auth and billing
6. dashboard and observability
7. deployment and docs

## Verification Checklist

- local infrastructure boots cleanly
- session ingestion persists metadata
- reflection writes graph memory
- retrieval returns ranked reusable context
- tenant isolation works
- Nevermined blocks unpaid access and meters usage
- dashboard shows sessions, reflections, and learnings
