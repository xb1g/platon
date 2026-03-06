# Bug: `memory.get_similar_failures` still mixes unfiltered Exa results into failure-only retrieval

## Summary
`memory.get_similar_failures` and `/retrieve` with `filters.statuses=["failed"]` now forward and enforce filters for graph and vector retrieval, but the route still appends Exa results that have no failure-status semantics. In practice, failure-only retrieval can still return non-failure external context.

## Severity
High

## Impact
During incident/risky work, agents still cannot trust `get_similar_failures` to return only prior failures, so irrelevant external context can dilute or outrank the intended failure corpus.

## Evidence and Reproduction
- MCP request path sends `filters: { statuses: ["failed"], ... }` from `getSimilarFailures`.
  - [apps/mcp/src/tools/get-similar-failures.ts](file:///Users/bunyasit/dev/platon/apps/mcp/src/tools/get-similar-failures.ts)
- API retrieval route now forwards `filters` into both graph and vector retrieval, but still calls Exa without filters and concatenates those results into the final payload:
  - [apps/api/src/routes/retrieve.ts](file:///Users/bunyasit/dev/platon/apps/api/src/routes/retrieve.ts): lines 36-55 and 73-74
- Vector retrieval now enforces `statuses` and `toolNames` during candidate loading and vector-store search:
  - [apps/api/src/lib/retrieval/vector-search.ts](file:///Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/vector-search.ts)
  - [apps/api/src/lib/retrieval/vector-store.ts](file:///Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/vector-store.ts)
- Regression tests cover filter forwarding and stale vector-hit filtering, but there is no route-level test preventing Exa leakage in filtered mode:
  - [apps/api/tests/retrieve.test.ts](file:///Users/bunyasit/dev/platon/apps/api/tests/retrieve.test.ts)
  - [apps/api/tests/vector-search.test.ts](file:///Users/bunyasit/dev/platon/apps/api/tests/vector-search.test.ts)
- Repro:
  1. Ingest mixed success/failure sessions into a namespace.
  2. Call `/retrieve` with `filters: { "statuses": ["failed"] }`.
  3. Observe that governed graph/vector results are failure-only, but additional Exa results are still appended even though they are not filtered by failure status.

## Root cause
- The original filter-forwarding gap in vector retrieval has been addressed.
- The remaining contract bug is that `/retrieve` treats Exa as a transparent peer backend even when the caller asks for failure-only or tool-constrained recall.
- `exaSearch` is query-only, so the route cannot guarantee that `results` still satisfy `filters.statuses` or `filters.toolNames` once Exa output is appended.

## Suggested fix
1. Do not append Exa results when `filters.statuses` or `filters.toolNames` are present, unless the API adds an explicit opt-in for external context.
2. If Exa remains enabled in filtered mode, return it in a separate field or label it clearly so callers can exclude non-governed external context.
3. Add a route-level regression test proving `/retrieve` with `statuses: ["failed"]` never returns unlabeled Exa results in `results`.
