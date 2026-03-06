# Retrieval Precision Fix Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two concrete retrieval bugs — the graph-search status filter position bug (failure filter leaks success sessions) and the ranking weight imbalance (type-boost for failure overrides semantic relevance).

**Architecture:** Two focused fixes in `graph-search.ts` and `rank.ts`. The graph-search fix moves session-level filters from the OPTIONAL MATCH WHERE clause (where they fail to filter) to the outer MATCH WHERE clause (where they correctly exclude sessions). The ranking fix increases the source signal (graph vs vector) and slightly reduces the failure type-boost so semantic similarity is the primary discriminator when memories are unrelated.

**Tech Stack:** TypeScript, Neo4j Cypher (via neo4j-driver), Vitest

---

## Background: Root Cause Analysis

### Bug 1 — graph-search.ts: Cypher filter is in the wrong clause

Current Cypher structure:
```cypher
MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_SESSION]->(s:Session)
OPTIONAL MATCH (s)-[:PRODUCED]->(l:Learning)
WHERE (l.title CONTAINS $query OR s.taskSummary CONTAINS $query)
  AND (l IS NULL OR coalesce(l.status, 'published') = 'published')
  AND s.status IN $statuses          -- BUG: this is inside OPTIONAL MATCH WHERE
  AND EXISTS { (s)-[:USED_TOOL]->... }
```

In Neo4j Cypher, `WHERE` after `OPTIONAL MATCH` only constrains which optional nodes (`l`) are bound — it does **not** filter the outer `s` rows. When the WHERE fails (e.g., `s.status = 'success'` with `statuses = ['failed']`), Neo4j sets `l = null` but keeps the `s` row in scope. The `WITH` block then uses `s.taskSummary` as the result title (the `l IS NOT NULL` branch is skipped), and the session passes `WHERE result.title IS NOT NULL`. Success sessions are returned despite the failure-only filter.

Fix: move the `s.status IN $statuses` and tool filter to the outer `MATCH` level.

### Bug 2 — rank.ts: Failure type-boost overrides semantic relevance

Current weights cause a `failure` memory (type-boost = 1.2×, multiplied over the entire score) to outrank a semantically more relevant `success_pattern` memory when the failure memory has moderate confidence and the semantic similarity difference is not large enough. The `sourceBoost` weight is only 0.1 so graph vs vector source barely matters. Vector-only failure memories can defeat graph-matched success memories.

Fix: raise `WEIGHTS.sourceBoost` from `0.1` to `0.30`, lower `SOURCE_BOOST[vector]` from `0.7` to `0.35` (making graph text-match hits clearly preferred over vector-only hits), and reduce `TYPE_BOOST[failure]` from `1.2` to `1.1` (keep a modest failure preference without dominating semantic relevance).

**Verified numerically:** With the proposed weights, all 9 existing passing tests continue to pass. The currently failing test ("combines vector and graph results before ranking") also passes (graph-failure score: 1.071 vs vector-learning score: 1.048). The issue scenario (Redis graph hit > Postgres vector-only failure) passes across realistic similarity ranges.

### What is NOT changed
- `retrieve.ts` — already passes `filters` to both `graphSearch` and `vectorSearch`; no change needed
- `vector-search.ts` / `vector-store.ts` — already filter correctly at both Neo4j load and Postgres query levels; no change needed
- No schema migrations needed

---

## File Map

| File | Change |
|------|--------|
| `apps/api/src/lib/retrieval/graph-search.ts` | Move status+tool filters from OPTIONAL MATCH WHERE → outer MATCH WHERE |
| `apps/api/src/lib/retrieval/rank.ts` | Adjust `SOURCE_BOOST[vector]`, `WEIGHTS.sourceBoost`, `TYPE_BOOST[failure]` |
| `apps/api/tests/retrieval-ranking.test.ts` | Add 2 new test cases for issue scenarios; existing tests remain unchanged |

---

## Chunk 1: Fix graph-search.ts filter position

### Task 1: Write a failing test that proves the status filter must precede OPTIONAL MATCH

**Files:**
- Modify: `apps/api/tests/retrieval-ranking.test.ts`

- [ ] **Step 1: Add the failing test**

In `retrieval-ranking.test.ts`, inside the `describe('Retrieval Ranking')` block, add after the existing `graphSearch` test (after line 94):

```typescript
it('status filter in graph search is applied at the outer session level, not inside OPTIONAL MATCH', async () => {
  const session = {
    run: vi.fn().mockResolvedValue({ records: [] }),
  } as any;

  await graphSearch(
    {
      namespaceId: 'ns-123',
      query: 'postgres migration',
      limit: 5,
      filters: { statuses: ['failed'], toolNames: [] },
    },
    { session }
  );

  const [query] = session.run.mock.calls[0];
  const outerMatchIndex = query.indexOf('MATCH (ns:MemoryNamespace');
  const optionalMatchIndex = query.indexOf('OPTIONAL MATCH');
  const statusFilterIndex = query.indexOf('s.status IN $statuses');

  // The status filter must appear in the outer MATCH WHERE, before OPTIONAL MATCH
  expect(statusFilterIndex).toBeGreaterThan(outerMatchIndex);
  expect(statusFilterIndex).toBeLessThan(optionalMatchIndex);
});

it('tool filter in graph search is applied at the outer session level, not inside OPTIONAL MATCH', async () => {
  const session = {
    run: vi.fn().mockResolvedValue({ records: [] }),
  } as any;

  await graphSearch(
    {
      namespaceId: 'ns-123',
      query: 'postgres migration',
      limit: 5,
      filters: { statuses: [], toolNames: ['psql'] },
    },
    { session }
  );

  const [query] = session.run.mock.calls[0];
  const optionalMatchIndex = query.indexOf('OPTIONAL MATCH');
  const toolFilterIndex = query.indexOf('t.name IN $toolNames');

  // The tool filter must appear before OPTIONAL MATCH
  expect(toolFilterIndex).toBeLessThan(optionalMatchIndex);
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
cd apps/api && pnpm test -- --reporter=verbose tests/retrieval-ranking.test.ts 2>&1 | grep -E "FAIL|PASS|✓|✗|status filter|tool filter"
```

Expected: the 2 new tests FAIL (filter index is after OPTIONAL MATCH in current code).

- [ ] **Step 3: Commit the failing tests**

```bash
cd apps/api && git add tests/retrieval-ranking.test.ts
git commit -m "test(retrieval): add failing tests for graph-search filter position bug"
```

---

### Task 2: Fix graph-search.ts — move filters to outer MATCH WHERE

**Files:**
- Modify: `apps/api/src/lib/retrieval/graph-search.ts`

- [ ] **Step 1: Replace the `statusFilter` and `toolFilter` variables and the query template**

Open `apps/api/src/lib/retrieval/graph-search.ts`.

Replace lines 32–82 (the two filter variables and the `session.run` call):

**Old code (lines 32–82):**
```typescript
  const statusFilter = params.filters?.statuses?.length
    ? 'AND s.status IN $statuses'
    : '';

  const toolFilter = params.filters?.toolNames?.length
    ? 'AND EXISTS { (s)-[:USED_TOOL]->(t:Tool) WHERE t.name IN $toolNames }'
    : '';

  const result = await deps.session.run(
    `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_SESSION]->(s:Session)
     OPTIONAL MATCH (s)-[:PRODUCED]->(l:Learning)
     WHERE (l.title CONTAINS $query OR s.taskSummary CONTAINS $query)
       AND (l IS NULL OR coalesce(l.status, 'published') = 'published')
     ${statusFilter}
     ${toolFilter}
```

**New code:**
```typescript
  const sessionFilterParts: string[] = [];
  if (params.filters?.statuses?.length) {
    sessionFilterParts.push('s.status IN $statuses');
  }
  if (params.filters?.toolNames?.length) {
    sessionFilterParts.push(
      'EXISTS { (s)-[:USED_TOOL]->(t:Tool) WHERE t.name IN $toolNames }'
    );
  }
  const sessionWhereClause =
    sessionFilterParts.length > 0
      ? `WHERE ${sessionFilterParts.join(' AND ')}`
      : '';

  const result = await deps.session.run(
    `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_SESSION]->(s:Session)
     ${sessionWhereClause}
     OPTIONAL MATCH (s)-[:PRODUCED]->(l:Learning)
     WHERE (l.title CONTAINS $query OR s.taskSummary CONTAINS $query)
       AND (l IS NULL OR coalesce(l.status, 'published') = 'published')
```

The remainder of the query (WITH, CASE, WHERE result.title IS NOT NULL, RETURN) stays unchanged.

- [ ] **Step 2: Run the full test suite**

```bash
cd apps/api && pnpm test 2>&1 | tail -20
```

Expected: ALL previously passing tests still pass, AND the 2 new filter-position tests now pass.

- [ ] **Step 3: Commit the fix**

```bash
cd apps/api && git add src/lib/retrieval/graph-search.ts
git commit -m "fix(retrieval): move graph-search session filters to outer MATCH WHERE clause

Status and tool filters placed inside OPTIONAL MATCH WHERE only constrain
which Learning nodes bind to l; they do not exclude Session rows from the
outer MATCH. Sessions with the wrong status were returned with l=null,
passing the result.title IS NOT NULL guard via s.taskSummary.

Move filters to a WHERE clause on the outer MATCH so sessions with
non-matching status are excluded before the optional traversal."
```

---

## Chunk 2: Fix ranking weights

### Task 3: Write failing ranking tests for the issue scenarios

**Files:**
- Modify: `apps/api/tests/retrieval-ranking.test.ts`

- [ ] **Step 1: Add two new ranking scenario tests**

Add these tests at the end of the `describe('Retrieval Ranking')` block (after the last existing test):

```typescript
it('graph-source success hit outranks vector-only failure when graph hit is exact-match relevant', () => {
  // Scenario from production issue: "redis failover" query
  // Redis success memory appears in graph results (CONTAINS match) AND vector results
  // Postgres failure appears ONLY in vector results (no text match for redis query)
  const graphResults: RankTestResult[] = [
    makeResult({
      id: 'redis-success',
      type: 'success_pattern',
      title: 'Redis failover recovery',
      confidence: 0.7,
      namespaceMatch: 'exact',
      signal: 'semantic',
    }),
  ];

  const vectorResults: RankTestResult[] = [
    makeResult({
      id: 'postgres-failure',
      type: 'failure',
      title: 'Postgres billing-ledger migration lock timeout',
      confidence: 0.8,
      qualityScore: 0.85,
      namespaceMatch: 'exact',
      signal: 'failure_pattern',
      semanticSimilarity: 0.48,
    }),
  ];

  const ranked = rankResults(graphResults, vectorResults);

  // Redis success (graph hit = exact text match) should beat Postgres failure (vector-only, low similarity)
  expect(ranked[0].id).toBe('redis-success');
});

it('high-similarity vector success outranks low-similarity vector failure in unfiltered retrieval', () => {
  // When both are vector-only results, high semantic similarity should dominate
  const graphResults: RankTestResult[] = [];

  const vectorResults: RankTestResult[] = [
    makeResult({
      id: 'redis-success',
      type: 'success_pattern',
      title: 'Redis failover recovery',
      confidence: 0.7,
      namespaceMatch: 'exact',
      signal: 'semantic',
      semanticSimilarity: 0.85,
    }),
    makeResult({
      id: 'postgres-failure',
      type: 'failure',
      title: 'Postgres billing-ledger migration lock timeout',
      confidence: 0.8,
      qualityScore: 0.85,
      namespaceMatch: 'exact',
      signal: 'failure_pattern',
      semanticSimilarity: 0.42,
    }),
  ];

  const ranked = rankResults(graphResults, vectorResults);

  // High semantic similarity (0.85) should beat low-sim failure (0.42) despite failure type boost
  expect(ranked[0].id).toBe('redis-success');
});
```

- [ ] **Step 2: Run to confirm the new tests fail**

```bash
cd apps/api && pnpm test -- --reporter=verbose tests/retrieval-ranking.test.ts 2>&1 | grep -E "FAIL|PASS|✓|✗|graph-source|high-similarity"
```

Expected: 2 new tests FAIL (and the "combines vector and graph results" test is still failing too).

- [ ] **Step 3: Commit the failing tests**

```bash
cd apps/api && git add tests/retrieval-ranking.test.ts
git commit -m "test(ranking): add failing tests for semantic relevance primacy over failure type boost"
```

---

### Task 4: Fix rank.ts — adjust source boost and failure type boost

**Files:**
- Modify: `apps/api/src/lib/retrieval/rank.ts`

- [ ] **Step 1: Update the three constants**

In `apps/api/src/lib/retrieval/rank.ts`, make the following targeted changes:

**Change 1 — `WEIGHTS.sourceBoost`: line ~27**

Old:
```typescript
  sourceBoost: 0.1,
```

New:
```typescript
  sourceBoost: 0.30,
```

**Change 2 — `SOURCE_BOOST`: lines ~30–33**

Old:
```typescript
const SOURCE_BOOST: Record<string, number> = {
  graph: 1.0,
  vector: 0.7,
};
```

New:
```typescript
const SOURCE_BOOST: Record<string, number> = {
  graph: 1.0,
  vector: 0.35,
};
```

**Change 3 — `TYPE_BOOST[failure]`: lines ~35–40**

Old:
```typescript
const TYPE_BOOST: Record<string, number> = {
  failure: 1.2,
  learning: 1.1,
  success_pattern: 1.0,
  session: 0.8,
};
```

New:
```typescript
const TYPE_BOOST: Record<string, number> = {
  failure: 1.1,
  learning: 1.1,
  success_pattern: 1.0,
  session: 0.8,
};
```

**Rationale for each change:**
- `sourceBoost` weight 0.1 → 0.30: graph text-match hits are much stronger evidence of relevance than vector-only hits; amplify this signal
- `SOURCE_BOOST[vector]` 0.7 → 0.35: creates a meaningful ~2× advantage for graph-matched memories over vector-only memories; vector-only failure memories can no longer dominate graph-matched success memories
- `TYPE_BOOST[failure]` 1.2 → 1.1: failure memories still get a meaningful preference, but the 20% global multiplier was overriding semantic relevance when the failure was only a vector-only weak match

- [ ] **Step 2: Run the full test suite**

```bash
cd apps/api && pnpm test 2>&1 | tail -25
```

Expected: ALL tests pass (0 failures). This includes:
- The 2 filter-position tests from Task 1
- The 2 new ranking scenario tests from Task 3
- The previously failing "combines vector and graph results" test
- All 9 previously passing tests

- [ ] **Step 3: Commit the ranking fix**

```bash
cd apps/api && git add src/lib/retrieval/rank.ts
git commit -m "fix(ranking): increase graph source signal and reduce failure type boost

Graph text-match hits are much stronger relevance evidence than vector-only
semantic matches. Raise sourceBoost weight (0.1 → 0.30) and reduce vector
SOURCE_BOOST (0.7 → 0.35) so graph-matched memories clearly outrank
vector-only matches regardless of type.

Reduce TYPE_BOOST[failure] from 1.2 to 1.1: failure memories keep a
modest preference, but the former 20% global multiplier was overriding
semantic relevance — unrelated vector-only failure memories with moderate
confidence were outranking highly relevant success memories.

Together these changes ensure:
- Redis graph-hit success beats Postgres vector-only failure for redis queries
- High-similarity vector success beats low-similarity vector failure
- Graph failure (exact text match) still beats high-similarity vector learning
- All existing tests continue to pass"
```

---

## Chunk 3: Final verification

### Task 5: Run the complete test suite and confirm zero failures

- [ ] **Step 1: Run all tests**

```bash
cd apps/api && pnpm test 2>&1
```

Expected output (all tests pass):
```
Test Files  0 failed | 11 passed | 1 skipped (13)
     Tests  0 failed | 65 passed | 1 skipped (66)
```

(65 = 61 previously passing + 2 filter-position + 2 ranking scenario tests)

- [ ] **Step 2: Verify specific tests by name**

```bash
cd apps/api && pnpm test -- --reporter=verbose tests/retrieval-ranking.test.ts 2>&1 | grep -E "✓|✗"
```

Expected: all 14 tests in retrieval-ranking.test.ts show ✓.

- [ ] **Step 3: If all pass, create a summary commit (optional)**

If you made incremental commits above, skip this step. The changes are already committed.

---

## Acceptance Criteria Mapping

| Issue requirement | Addressed by |
|---|---|
| `get_similar_failures` never returns success memories | Task 2 (graph-search filter bug fixed — success sessions excluded at MATCH level) |
| `filters.statuses = ['failed']` honored across graph retrieval | Task 2 |
| Redis-specific retrieval ranks Redis above unrelated Postgres | Task 4 (source boost + reduced type boost) |
| Controlled namespace (1 success, 1 failure) returns only failure for failure queries | Task 2 (graph) + vector-search.ts already correct |
| All existing tests pass | Verified in Task 5 |
| Failing test "combines vector and graph results" fixed | Task 4 |

## What this does NOT change

- `retrieve.ts` — already correctly passes filters to both search paths
- `vector-search.ts` / `vector-store.ts` — already filter correctly; no change
- E2E tests (require live infra) — not run in this plan
- Documentation/marketing claims — product positioning is a separate task for the owner
