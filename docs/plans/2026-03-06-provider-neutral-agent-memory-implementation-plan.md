# Provider-Neutral Agent Memory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish provider-neutral session ingestion so explicit `dump_session` calls persist raw sessions, enqueue reflection, update Neo4j, and stay aligned across HTTP, MCP, and optional provider adapters.

**Architecture:** The shared schema in `packages/shared` remains the canonical contract for both HTTP and MCP. The API writes raw sessions to Postgres and enqueues BullMQ jobs; the worker loads stored sessions, reflects them, writes namespace-scoped graph data to Neo4j, and updates Postgres reflection status. Provider-specific automation stays optional and thin.

**Tech Stack:** TypeScript, Fastify, Zod, pg/Postgres, BullMQ, Redis, Neo4j, Vitest, MCP SDK

---

### Task 1: Define the raw session persistence model

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/api/src/lib/session-store.ts`
- Create: `/Users/bunyasit/dev/platon/apps/api/src/lib/db/init.sql`
- Modify: `/Users/bunyasit/dev/platon/apps/api/src/lib/postgres.ts`
- Test: `/Users/bunyasit/dev/platon/apps/api/tests/sessions.test.ts`

**Step 1: Write the failing test**

Add a `sessions.test.ts` case that posts a valid payload and expects a real stored id, not `mock-id`, and expects persistence helpers to be called with `subscriberId`, `agentKind`, `agentId`, and `sessionId`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- sessions`
Expected: FAIL because the route still returns `mock-id` and no persistence helper exists.

**Step 3: Write minimal implementation**

Create a session store module with:

- `ensureSessionTable()`
- `insertRawSession()`
- `markReflectionQueued()`
- `markReflectionFailed()`
- `getRawSessionById()`

Use `payload_json` for the full request body and add a unique key on `(subscriber_id, agent_kind, agent_id, session_id)`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- sessions`
Expected: PASS for the persistence assertion once the route can call the store.

**Step 5: Commit**

```bash
git add apps/api/src/lib/session-store.ts apps/api/src/lib/db/init.sql apps/api/src/lib/postgres.ts apps/api/tests/sessions.test.ts
git commit -m "feat: add raw session persistence model"
```

### Task 2: Add the API queue producer for reflection jobs

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/api/src/lib/reflection-queue.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/api/src/lib/redis.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/api/src/routes/sessions.ts`
- Test: `/Users/bunyasit/dev/platon/apps/api/tests/sessions.test.ts`

**Step 1: Write the failing test**

Add a test that posts a valid session and expects a `reflect-session` job to be added to `reflection-queue` with the stored row id and namespace fields.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- sessions`
Expected: FAIL because no queue producer exists and nothing is enqueued.

**Step 3: Write minimal implementation**

Create a BullMQ queue wrapper that exposes `enqueueReflectionJob()`. Update the session route to:

- validate the request
- insert the raw session row
- enqueue `reflect-session`
- update `reflection_status`
- return the stored id and status

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- sessions`
Expected: PASS with a real response shape such as `{ id, status: "queued", subscriberId, agentId, agentKind }`.

**Step 5: Commit**

```bash
git add apps/api/src/lib/reflection-queue.ts apps/api/src/lib/redis.ts apps/api/src/routes/sessions.ts apps/api/tests/sessions.test.ts
git commit -m "feat: enqueue reflection jobs from session ingestion"
```

### Task 3: Make API enqueue failures durable and visible

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/api/src/routes/sessions.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/api/src/lib/session-store.ts`
- Test: `/Users/bunyasit/dev/platon/apps/api/tests/sessions.test.ts`

**Step 1: Write the failing test**

Add a test where the raw session insert succeeds but queue publish throws. Expect the raw row to remain stored and the response to expose a non-success reflection state.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- sessions`
Expected: FAIL because the current route does not preserve or report partial ingestion outcomes.

**Step 3: Write minimal implementation**

On queue publish failure:

- keep the inserted row
- mark `reflection_status = "pending_retry"` or `"failed"`
- include the stored id in the response
- log enough context for replay

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- sessions`
Expected: PASS with durable partial-failure behavior.

**Step 5: Commit**

```bash
git add apps/api/src/routes/sessions.ts apps/api/src/lib/session-store.ts apps/api/tests/sessions.test.ts
git commit -m "feat: preserve raw sessions when enqueue fails"
```

### Task 4: Load reflected sessions from Postgres in the worker

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/worker/src/lib/session-store.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/worker/src/jobs/reflect-session.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/worker/src/index.ts`
- Test: `/Users/bunyasit/dev/platon/apps/worker/tests/reflect-session.test.ts`

**Step 1: Write the failing test**

Add a worker test that feeds a queued job payload containing the persisted row id and namespace metadata, then expects the worker to load the raw payload from Postgres before calling `llmReflect`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/worker test -- reflect-session`
Expected: FAIL because the worker currently expects the full reflection input directly from the job body.

**Step 3: Write minimal implementation**

Implement a worker-side session store reader and update `reflectSession()` so the job input can be:

- `rawSessionId`
- `subscriberId`
- `agentKind`
- `agentId`

Load the stored payload, then call `llmReflect()` with the hydrated session data.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/worker test -- reflect-session`
Expected: PASS with durable load-before-reflect behavior.

**Step 5: Commit**

```bash
git add apps/worker/src/lib/session-store.ts apps/worker/src/jobs/reflect-session.ts apps/worker/src/index.ts apps/worker/tests/reflect-session.test.ts
git commit -m "feat: hydrate reflection jobs from stored sessions"
```

### Task 5: Track worker reflection status in Postgres

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/worker/src/lib/session-store.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/worker/src/jobs/reflect-session.ts`
- Test: `/Users/bunyasit/dev/platon/apps/worker/tests/reflect-session.test.ts`

**Step 1: Write the failing test**

Add tests for:

- `reflection_status = "processing"` when a job starts
- `reflection_status = "completed"` and `reflection_completed_at` after success
- `reflection_status = "failed"` with `reflection_error` after failure

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/worker test -- reflect-session`
Expected: FAIL because no status transitions are recorded yet.

**Step 3: Write minimal implementation**

Add worker-side status updates around the reflection call and Neo4j write path.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/worker test -- reflect-session`
Expected: PASS with visible reflection lifecycle state.

**Step 5: Commit**

```bash
git add apps/worker/src/lib/session-store.ts apps/worker/src/jobs/reflect-session.ts apps/worker/tests/reflect-session.test.ts
git commit -m "feat: record reflection lifecycle in postgres"
```

### Task 6: Prove namespace-scoped graph writes from a persisted dump

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/worker/tests/reflect-session.test.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/worker/src/lib/store-reflection.ts`

**Step 1: Write the failing test**

Extend the worker test to assert that a persisted raw session with failures produces the expected namespace merge, session merge, learning merge, and success/failure session status in Neo4j.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/worker test -- reflect-session`
Expected: FAIL if persisted-input assumptions or namespace propagation are incomplete.

**Step 3: Write minimal implementation**

Adjust only what is needed so the persisted-path worker test reaches the existing graph write code without contract drift.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/worker test -- reflect-session`
Expected: PASS with end-to-end worker proof from durable input to Neo4j write.

**Step 5: Commit**

```bash
git add apps/worker/src/lib/store-reflection.ts apps/worker/tests/reflect-session.test.ts
git commit -m "test: prove reflected graph writes from persisted sessions"
```

### Task 7: Align MCP dump_session with the canonical shared contract

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/src/server.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/src/tools/dump-session.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/tests/server.test.ts`

**Step 1: Write the failing test**

Add or tighten MCP tests so `memory.dump_session` rejects legacy `content`-only usage and forwards the structured payload fields accepted by `sessionPayloadSchema`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test -- server`
Expected: FAIL if the MCP surface still allows undocumented drift or legacy docs.

**Step 3: Write minimal implementation**

Ensure the MCP tool schema and forwarding logic reflect the canonical payload and response text. Do not add alternate blob-based ingestion.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test -- server`
Expected: PASS with one canonical dump contract.

**Step 5: Commit**

```bash
git add apps/mcp/src/server.ts apps/mcp/src/tools/dump-session.ts apps/mcp/tests/server.test.ts
git commit -m "feat: align mcp dump session contract"
```

### Task 8: Remove doc and rule drift across agent integrations

**Files:**
- Modify: `/Users/bunyasit/dev/platon/.cursor/rules/platon-agent.mdc`
- Modify: `/Users/bunyasit/dev/platon/agent.md`
- Modify: `/Users/bunyasit/dev/platon/apps/web/docs/INTEGRATION.md`
- Modify: `/Users/bunyasit/dev/platon/apps/web/app/(marketing)/page.tsx`

**Step 1: Write the failing test**

If the repo has no doc tests, add one lightweight assertion in the most suitable package test file that scans these docs/examples for the deprecated `memory.dump_session(sessionId, content)` form.

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL because the deprecated signature still appears in docs and rule files.

**Step 3: Write minimal implementation**

Update docs and examples to show:

- explicit manual-first retrieval and dump behavior
- HTTP and MCP as co-equal interfaces
- structured `dump_session` payload fields
- Claude Hooks as an optional adapter, not the architecture

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS without references to the deprecated content-based contract.

**Step 5: Commit**

```bash
git add .cursor/rules/platon-agent.mdc agent.md apps/web/docs/INTEGRATION.md apps/web/app/'(marketing)'/page.tsx
git commit -m "docs: align agent integrations with structured memory contract"
```

### Task 9: Add an optional Claude Hooks adapter example

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/mcp/examples/claude-hooks/README.md`
- Create: `/Users/bunyasit/dev/platon/apps/mcp/examples/claude-hooks/session-start.ts`
- Create: `/Users/bunyasit/dev/platon/apps/mcp/examples/claude-hooks/stop.ts`
- Modify: `/Users/bunyasit/dev/platon/agent.md`

**Step 1: Write the failing test**

If example tests exist, add a fixture or snapshot check that the example emits the canonical retrieve/dump payloads. Otherwise, write a small unit test in the MCP package for the payload builders used by the example scripts.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test`
Expected: FAIL because no Claude Hooks adapter example exists yet.

**Step 3: Write minimal implementation**

Add an example-only adapter showing:

- `SessionStart` retrieving context and returning additional context
- `Stop` building a structured session dump payload
- explicit opt-in config knobs

Keep it clearly documented as optional convenience.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test`
Expected: PASS with a validated adapter example.

**Step 5: Commit**

```bash
git add apps/mcp/examples/claude-hooks agent.md
git commit -m "docs: add optional claude hooks adapter example"
```

### Task 10: Add an end-to-end ingestion smoke test

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/api/tests/session-ingestion.smoke.test.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/api/tests/sessions.test.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/worker/tests/reflect-session.test.ts`

**Step 1: Write the failing test**

Create a smoke test that exercises:

- valid HTTP or MCP dump request
- Postgres persistence
- queue publish
- worker processing
- reflection status completion

Mock external LLM and Neo4j layers as needed, but keep the ingest, queue, and status transitions real within the test boundary.

**Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL because the live ingestion chain is not fully wired.

**Step 3: Write minimal implementation**

Fill any remaining seams needed for the smoke test only. Do not duplicate business logic in test-only code.

**Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS with one end-to-end proof that a normal dump reaches the reflection path.

**Step 5: Commit**

```bash
git add apps/api/tests/session-ingestion.smoke.test.ts apps/api/tests/sessions.test.ts apps/worker/tests/reflect-session.test.ts
git commit -m "test: prove end-to-end session ingestion flow"
```

### Task 11: Run final verification before claiming completion

**Files:**
- Modify: `/Users/bunyasit/dev/platon/docs/plans/2026-03-06-provider-neutral-agent-memory-design.md`
- Modify: `/Users/bunyasit/dev/platon/docs/plans/2026-03-06-provider-neutral-agent-memory-implementation-plan.md`

**Step 1: Run targeted package tests**

Run: `pnpm --filter @memory/api test -- sessions`
Expected: PASS

Run: `pnpm --filter @memory/worker test -- reflect-session`
Expected: PASS

Run: `pnpm --filter @memory/mcp test -- server`
Expected: PASS

**Step 2: Run full verification**

Run: `pnpm test`
Expected: PASS

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Update plan notes**

Record any deviations, follow-up cleanup, or production rollout notes directly in the design and plan docs.

**Step 4: Commit**

```bash
git add docs/plans/2026-03-06-provider-neutral-agent-memory-design.md docs/plans/2026-03-06-provider-neutral-agent-memory-implementation-plan.md
git commit -m "docs: finalize provider-neutral agent memory plan"
```
