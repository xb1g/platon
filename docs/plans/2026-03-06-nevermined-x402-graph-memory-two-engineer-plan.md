# Nevermined x402 Graph Memory Two-Engineer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the first end-to-end paid memory platform flow where external agents subscribe through Nevermined, obtain x402 access tokens, call the API or MCP server directly, and read or write memory isolated by `subscriberId + agentKind + agentId` in Neo4j.

**Architecture:** The API and MCP layers both use Nevermined x402 as the runtime access mechanism. The API verifies x402 tokens, derives subscriber identity, resolves a graph `MemoryNamespace`, writes raw sessions plus async reflection jobs, and retrieves only from the verified namespace. The MCP server is a thin paid interface over the same service layer and isolation rules.

**Tech Stack:** TypeScript, Fastify, MCP SDK, Vitest, Neo4j, Postgres, Redis, `@nevermined-io/payments`

---

## Delivery Model

Two engineers work in parallel after agreeing on the shared contracts.

- **Engineer A** owns auth, paywall, API contracts, and setup scripts.
- **Engineer B** owns graph namespace modeling, retrieval, worker writes, and MCP integration.

Shared rule: no one invents a second identity system. Runtime identity comes from Nevermined verification, and graph access always starts from `MemoryNamespace`.

## Phase 0: Shared Contract Lock

This phase is sequential and should be finished before the two tracks diverge.

### Task 1: Lock shared runtime schemas

**Owner:** Engineer A + Engineer B

**Files:**
- Modify: `packages/shared/src/session.ts`
- Modify: `packages/shared/src/retrieval.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/session.test.ts`

**Step 1: Write the failing test**

Add schema tests that prove:

- session payload requires `agentKind`
- retrieval payload requires `agentKind` and `agentId`
- legacy `tenantId` is not required for runtime isolation

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/shared test`
Expected: FAIL because the current schemas still model tenant-centric payloads.

**Step 3: Write minimal implementation**

Update shared schemas so the runtime payload contract is:

- session payload: `agentId`, `agentKind`, `sessionId`, `task`, `outcome`, optional events/artifacts/errors
- retrieval payload: `agentId`, `agentKind`, `query`, `limit`, `filters`

Keep any optional dashboard or internal tenant fields explicitly non-authoritative.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/shared test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat: define x402-scoped shared memory contracts"
```

---

## Engineer A Track: Nevermined Auth, API Surface, Setup

### Task 2A: Replace mock auth with x402-derived auth context

**Owner:** Engineer A

**Files:**
- Modify: `apps/api/src/plugins/auth.ts`
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/tests/auth.test.ts`

**Step 1: Write the failing test**

Cover:

- unpaid protected request is rejected
- verified paid request exposes normalized auth context on the request
- request body values do not override token-derived identity

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- auth`
Expected: FAIL because auth is currently mocked and hardcodes `tenant-1`.

**Step 3: Write minimal implementation**

Refactor auth into a request context plugin that can carry:

- `subscriberId`
- `agentId`
- `agentKind`
- `planId`

Do not rely on `Authorization: Bearer` for the paid runtime path.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- auth`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add x402 request auth context"
```

### Task 3A: Harden the Nevermined paywall plugin

**Owner:** Engineer A

**Files:**
- Modify: `apps/api/src/plugins/paywall.ts`
- Modify: `apps/api/tests/paywall.test.ts`
- Modify: `apps/api/package.json`

**Step 1: Write the failing test**

Extend paywall tests to prove:

- `POST /sessions` and `POST /retrieve` are protected
- `GET /health` remains public
- successful protected requests attach settlement metadata
- invalid token path does not call settlement

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: FAIL because the current plugin only handles a minimal mock flow.

**Step 3: Write minimal implementation**

Implement the production paywall behavior:

- build `payment-required` headers from configured plan and agent
- verify `payment-signature`
- store request payment context
- redeem credits on successful responses only
- expose derived auth metadata to downstream handlers

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: harden nevermined x402 api paywall"
```

### Task 4A: Add builder registration and subscriber flow docs/scripts

**Owner:** Engineer A

**Files:**
- Create: `apps/api/src/scripts/register-nevermined-agent.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Create: `docs/runbooks/nevermined-x402-flow.md`

**Step 1: Write the failing test**

Add a lightweight script smoke test or validation test that fails when required Nevermined builder env vars are missing.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- register`
Expected: FAIL because the script and env validation do not exist yet.

**Step 3: Write minimal implementation**

Create a one-time registration script that:

- initializes `Payments`
- registers agent and plan for the API surface
- persists or prints `NVM_AGENT_ID` and `NVM_PLAN_ID`

Document the subscriber-agent flow:

- order plan
- get x402 token
- call API or MCP endpoint

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- register`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/scripts .env.example README.md docs/runbooks/nevermined-x402-flow.md
git commit -m "docs: add nevermined registration and subscriber flow"
```

### Task 5A: Make the API routes consume verified auth context

**Owner:** Engineer A

**Files:**
- Modify: `apps/api/src/routes/sessions.ts`
- Modify: `apps/api/src/routes/retrieve.ts`
- Test: `apps/api/tests/sessions.test.ts`
- Test: `apps/api/tests/retrieve.test.ts`

**Step 1: Write the failing test**

Prove that:

- routes no longer trust caller-supplied tenant identity
- route handlers require verified auth context
- payload `agentId` and `agentKind` mismatches are rejected

**Step 2: Run test to verify it fails**

Run:
- `pnpm --filter @memory/api test -- sessions`
- `pnpm --filter @memory/api test -- retrieve`

Expected: FAIL because routes still accept body data without verified namespace checks.

**Step 3: Write minimal implementation**

Use the verified auth context as the source of truth for subscriber identity and enforce body consistency checks for `agentId` and `agentKind`.

**Step 4: Run test to verify it passes**

Run:
- `pnpm --filter @memory/api test -- sessions`
- `pnpm --filter @memory/api test -- retrieve`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: enforce verified namespace inputs in api routes"
```

---

## Engineer B Track: Graph Namespace, Retrieval, Worker, MCP

### Task 2B: Introduce namespace-first graph access

**Owner:** Engineer B

**Files:**
- Modify: `apps/api/src/lib/neo4j.ts`
- Create: `apps/api/src/lib/memory-namespace.ts`
- Test: `apps/api/tests/retrieve.test.ts`

**Step 1: Write the failing test**

Add tests that prove namespace resolution uses:

- `subscriberId`
- `agentKind`
- `agentId`

and different namespaces do not share results.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- retrieve`
Expected: FAIL because Neo4j access is currently unscoped and retrieval is stubbed.

**Step 3: Write minimal implementation**

Create a namespace helper that returns a stable `namespaceId` and centralizes the Neo4j `MERGE` logic for the namespace node.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- retrieve`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add memory namespace graph helper"
```

### Task 3B: Implement namespace-scoped graph retrieval

**Owner:** Engineer B

**Files:**
- Modify: `apps/api/src/lib/retrieval/graph-search.ts`
- Modify: `apps/api/src/lib/retrieval/rank.ts`
- Test: `apps/api/tests/retrieval-ranking.test.ts`

**Step 1: Write the failing test**

Cover:

- exact namespace match beats cross-namespace match
- failure-pattern hits beat generic semantic matches
- fresh high-confidence learnings rank above stale weak ones

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- retrieval-ranking`
Expected: FAIL because graph retrieval is currently empty.

**Step 3: Write minimal implementation**

Implement Neo4j traversal that begins from `MemoryNamespace` and ranks results with confidence, freshness, and exactness boosts.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- retrieval-ranking`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add namespace-scoped graph retrieval"
```

### Task 4B: Make worker writes namespace-aware

**Owner:** Engineer B

**Files:**
- Modify: `apps/worker/src/jobs/reflect-session.ts`
- Modify: `apps/worker/src/lib/store-reflection.ts`
- Test: `apps/worker/tests/reflect-session.test.ts`

**Step 1: Write the failing test**

Cover:

- reflection write creates or reuses the correct namespace
- session and learnings are attached only to that namespace
- identical failure patterns in different namespaces stay separated

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/worker test`
Expected: FAIL because worker persistence is not namespace-aware yet.

**Step 3: Write minimal implementation**

Update reflection persistence so graph writes begin from resolved namespace nodes and then attach session, learning, tool, and artifact entities.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/worker test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/worker
git commit -m "feat: write reflected memory into namespaces"
```

### Task 5B: Convert MCP server from mock tools to paid namespace-aware tools

**Owner:** Engineer B

**Files:**
- Modify: `apps/mcp/src/server.ts`
- Modify: `apps/mcp/src/tools/dump-session.ts`
- Modify: `apps/mcp/src/tools/retrieve-context.ts`
- Modify: `apps/mcp/src/tools/get-similar-failures.ts`
- Test: `apps/mcp/tests/server.test.ts`

**Step 1: Write the failing test**

Cover:

- tool listing still works
- unauthenticated tool call fails
- paid tool call invokes shared namespace-aware ingestion/retrieval behavior

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test`
Expected: FAIL because the MCP server is currently stdio-only and mocks payment success.

**Step 3: Write minimal implementation**

Adapt MCP tools so they call shared service functions or the protected HTTP API, while preserving the same x402 and namespace constraints as the HTTP surface.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp
git commit -m "feat: add paid namespace-aware mcp tools"
```

---

## Integration Phase: Both Engineers

### Task 6: Wire session ingestion end to end

**Owner:** Engineer A + Engineer B

**Files:**
- Modify: `apps/api/src/routes/sessions.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/api/src/lib/postgres.ts`
- Modify: `apps/api/src/lib/redis.ts`
- Test: `apps/api/tests/sessions.test.ts`
- Test: `apps/worker/tests/reflect-session.test.ts`

**Step 1: Write the failing test**

Add an integration-oriented test proving:

- paid session ingest persists raw session metadata
- job enqueue happens once
- worker reflection stores graph memory under the correct namespace

**Step 2: Run test to verify it fails**

Run:
- `pnpm --filter @memory/api test -- sessions`
- `pnpm --filter @memory/worker test`

Expected: FAIL because the current flow is only partially stubbed.

**Step 3: Write minimal implementation**

Complete the handoff from API ingest to queue to worker to graph write.

**Step 4: Run test to verify it passes**

Run:
- `pnpm --filter @memory/api test -- sessions`
- `pnpm --filter @memory/worker test`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api apps/worker
git commit -m "feat: wire paid session ingest through reflection pipeline"
```

### Task 7: Wire retrieval end to end

**Owner:** Engineer A + Engineer B

**Files:**
- Modify: `apps/api/src/routes/retrieve.ts`
- Modify: `apps/api/src/lib/retrieval/vector-search.ts`
- Modify: `apps/api/src/lib/retrieval/graph-search.ts`
- Test: `apps/api/tests/retrieve.test.ts`
- Test: `apps/api/tests/retrieval-ranking.test.ts`

**Step 1: Write the failing test**

Prove that a paid retrieval request:

- is verified by x402
- resolves the namespace
- returns only namespace-local ranked results

**Step 2: Run test to verify it fails**

Run:
- `pnpm --filter @memory/api test -- retrieve`
- `pnpm --filter @memory/api test -- retrieval-ranking`

Expected: FAIL because retrieval is not yet fully wired.

**Step 3: Write minimal implementation**

Complete namespace-aware retrieval, optionally merging vector hits only from namespace-local documents.

**Step 4: Run test to verify it passes**

Run:
- `pnpm --filter @memory/api test -- retrieve`
- `pnpm --filter @memory/api test -- retrieval-ranking`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: ship end-to-end namespace retrieval"
```

### Task 8: Verify full paid API and MCP flows

**Owner:** Engineer A + Engineer B

**Files:**
- Modify: `apps/api/tests/paywall.test.ts`
- Modify: `apps/mcp/tests/server.test.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

Add final regression coverage proving:

- API paywall works
- MCP paywall works
- settlement occurs once
- namespace isolation survives both protocols

**Step 2: Run test to verify it fails**

Run:
- `pnpm --filter @memory/api test`
- `pnpm --filter @memory/mcp test`

Expected: FAIL until all protocol paths use the same contracts.

**Step 3: Write minimal implementation**

Fix final contract mismatches and document the canonical usage flow for subscriber agents.

**Step 4: Run test to verify it passes**

Run:
- `pnpm --filter @memory/api test`
- `pnpm --filter @memory/mcp test`
- `pnpm --filter @memory/worker test`
- `pnpm --filter @memory/shared test`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api apps/mcp apps/worker packages/shared README.md
git commit -m "feat: complete paid graph memory flow across api and mcp"
```

---

## Suggested Parallel Schedule

### Day 1

- Both: Task 1
- Engineer A: Task 2A
- Engineer B: Task 2B

### Day 2

- Engineer A: Task 3A
- Engineer B: Task 3B

### Day 3

- Engineer A: Task 4A and Task 5A
- Engineer B: Task 4B

### Day 4

- Engineer B: Task 5B
- Both: Task 6

### Day 5

- Both: Task 7
- Both: Task 8

## Handoff Rules

- Merge after every completed task, not after an entire track.
- Engineer A owns contract changes in `apps/api/src/plugins/*`.
- Engineer B owns contract changes in graph and MCP files.
- Any schema change in `packages/shared` requires both engineers to stop and rebase before continuing.

## Verification Checklist Before Calling It Done

- API protected routes return `402` without x402 token.
- Successful API requests redeem credits once.
- Successful MCP tool calls redeem credits once.
- Session ingestion writes into the correct `MemoryNamespace`.
- Retrieval never returns results from another `subscriberId`, `agentKind`, or `agentId`.
- README documents builder registration and subscriber-agent usage with no human-in-the-loop requirement.
