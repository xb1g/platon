# Platon Agent Evaluation Prompt

Use this prompt with a coding agent to evaluate Platon as a paid memory product for autonomous agents.

This file is also the persistent run ledger.

## Operating Rule

After every run, update this file in place.

- Refresh `Current Verdict` based on fresh evidence.
- Append a new entry to `Run Ledger`.
- Keep older run entries unless they are clearly superseded by a corrected rerun.
- Do not write findings only in chat output. Persist them here.

## Current Verdict

- Purchase and connect: partial
- Retrieve before work: broken
- Similar failures during risk: broken
- Dump after work: partial
- Automatic improvement loop: broken

## Prompt

Evaluate the current Platon product from the perspective of an external autonomous agent that should be able to plug in quickly, pay for access, use memory continuously, and improve over time.

Working directory:
- `/Users/bunyasit/dev/platon`

Goal:
- Determine what already works, what is broken, what is only partially useful, and what blocks the product goal: "easy plug-in to agents and it automatically gets better."

Scope:
1. Treat Platon as a paid memory product for autonomous agents.
2. Verify the real production flow where possible:
   - plan purchase and token acquisition assumptions
   - remote MCP connection
   - `memory.retrieve_context` before work
   - `memory.get_similar_failures` during risky or failing work
   - `memory.dump_session` after work
3. Judge both correctness and usefulness, not just whether endpoints return `200`.
4. Use fresh verification evidence. Do not trust prior notes without reproducing them.

Important context:
- Production MCP endpoint: `https://platon.bigf.me/mcp`
- Hosted install contract: `https://platon.bigf.me/agent-installation.md`
- Relevant code:
  - `/Users/bunyasit/dev/platon/apps/mcp/src/server.ts`
  - `/Users/bunyasit/dev/platon/apps/mcp/src/tools/dump-session.ts`
  - `/Users/bunyasit/dev/platon/apps/mcp/src/tools/retrieve-context.ts`
  - `/Users/bunyasit/dev/platon/apps/mcp/src/tools/get-similar-failures.ts`
  - `/Users/bunyasit/dev/platon/apps/api/src/routes/retrieve.ts`
  - `/Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/graph-search.ts`
  - `/Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/vector-search.ts`
  - `/Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/vector-store.ts`
  - `/Users/bunyasit/dev/platon/apps/web/docs/INTEGRATION.md`
  - `/Users/bunyasit/dev/platon/agent.md`

Known prior signal to verify independently:
- `memory.dump_session` appeared to work.
- `memory.retrieve_context` appeared useful for exact recent memories.
- `memory.get_similar_failures` may be imprecise because failed-only queries may still leak successful memories.

## Latest Findings

1) Finding: `get_similar_failures` does not reliably return failure-only memories
- User impact: similarity search during risk can return unrelated memories, reducing prevention of repeated failures.
- Evidence and reproduction:
  - MCP tool call sends `filters: { statuses: ["failed"], ... }` in `apps/mcp/src/tools/get-similar-failures.ts`.
  - API retrieval handler calls `graphSearch`, `vectorSearch`, and `exaSearch` concurrently but passes no filters to `vectorSearch` and always appends all `exaSearch` results.
  - `vector-search.ts` only accepts `{namespaceId, query, limit}` and `vector-store.ts` search enforces `status = 'published'`.
  - Fresh local reproduction on fresh namespace: `/sessions` accepted two records (success + failed), but `/retrieve` with `filters: { statuses: ["failed"] }` returned `results:[]` while no local reflection was available (showing no useful failure gating path even in the intended branch).
- Root cause:
  - Filter contract is lost between API endpoint and vector/Exa sources; failed filtering is not consistently applied to every retrieval channel.
- Exact file references:
  - [get-similar-failures.ts](/Users/bunyasit/dev/platon/apps/mcp/src/tools/get-similar-failures.ts):14-22
  - [retrieve.ts](/Users/bunyasit/dev/platon/apps/api/src/routes/retrieve.ts):36-55,67-70
  - [vector-search.ts](/Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/vector-search.ts):6-13,85-120
  - [vector-store.ts](/Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/vector-store.ts):245-269

2) Finding: Reflection pipeline can be permanently unproductive without an OpenAI key, so dumps do not become useful memory
- User impact: post-task dumping accepts data but future retrieval does not improve because memory is never governed into published learnings.
- Evidence and reproduction:
  - Local fresh namespace run against API `127.0.0.1:3003` with internal auth bypass and two sessions (`success` and `failed`) returned `201` for `/sessions`.
  - Retrieval immediately after ingest returned `200` with `"results":[]`.
  - Worker output showed `reflect-session has failed with OPENAI_API_KEY is required for model-backed reflection.`
  - DB query showed both raw sessions in `raw_sessions` with `reflection_status = failed` and `reflection_error = OPENAI_API_KEY is required for model-backed reflection.`
- Root cause:
  - Reflection depends on LLM model calls and exits early without `OPENAI_API_KEY`, so no published learnings are produced and retrieval remains empty or noisy.
- Exact file references:
  - [sessions.ts](/Users/bunyasit/dev/platon/apps/api/src/routes/sessions.ts):39-57,58-64
  - [llm.ts](/Users/bunyasit/dev/platon/apps/worker/src/lib/llm.ts):55-59
  - [dump-session.ts](/Users/bunyasit/dev/platon/apps/mcp/src/tools/dump-session.ts):34-36,42-53

3) Finding: MCP transport behavior requires explicit stream-compatible headers and rejects some clients quickly
- User impact: easy plug-in is fragile for non-MCP-aware clients; a valid JSON payload without correct Accept header can be rejected before auth and tool-level behavior is tested.
- Evidence and reproduction:
  - `POST https://platon.bigf.me/mcp` without `Accept: application/json, text/event-stream` returns `406 Not Acceptable`.
  - With correct Accept + `tools/call` and no auth, response is `Authorization required` (tool-level gating).
  - With bogus bearer token, response is `Payment required. Available plans...`.
- Root cause:
  - Transport contract is strict around StreamableHTTP content-type/accept behavior and not clearly surfaced as a zero-configuration onboarding step.
- Exact file references:
  - [server.ts](/Users/bunyasit/dev/platon/apps/mcp/src/server.ts):327-345

4) Finding: Onboarding requires hidden identity/payment prerequisites beyond the install contract’s narrative
- User impact: external adoption requires setting up Nevermined keys, stable `agentKind`/`agentId`, and payment/headers correctly; partial docs exist but assumptions are still implicit for first-time operators.
- Evidence and reproduction:
  - Production install contract returns clear plan/token guidance and canonical identity guidance.
  - Local/server-side MCP startup still requires `NVM_API_KEY` at server initialization (`createPaymentsService`).
  - MCP tool schemas intentionally do not include `paymentToken`, so credentials must be sent on transport header only.
- Root cause:
  - Missing explicit runtime validation/examples for transport acceptance and required env matrix during first-run onboarding.
- Exact file references:
  - [server.ts](/Users/bunyasit/dev/platon/apps/mcp/src/server.ts):89-99,101-111,64-83,64-87,327-345
  - [INTEGRATION.md](/Users/bunyasit/dev/platon/apps/web/docs/INTEGRATION.md):27-31,51-57,174-209
  - [agent.md](/Users/bunyasit/dev/platon/agent.md):5-15,70-75

## Verdict Table

- purchase and connect: partial
- retrieve before work: broken
- similar failures during risk: broken
- dump after work: partial
- automatic improvement loop: broken

## Product Assessment

What is good enough to ship now:
- Paid access and endpoint discovery are mostly defined: install contract exists, Nevermined diagnostics are exposed, and MCP tool schemas are discoverable with stable tool names.
- Endpoint mechanics for ingestion are present (`POST /sessions`, `POST /retrieve`, MCP equivalents).

What should not be claimed yet:
- "It automatically improves over time" is not yet true in default end-to-end behavior because reflection can stall without complete external model config.
- "Failed-memory lookup is failure-specific" is not safe to claim yet because status filters are not consistently enforced in all retrieval channels.

## Fix Plan

1) Enforce status+tool filters consistently across all retrieval sources
- Why it matters: ensures `memory.get_similar_failures` returns the failure corpus you need during incidents, otherwise the loop cannot avoid repeated mistakes.
- Verify after fix:
  - Send `memory.get_similar_failures` with a known mixed status corpus and confirm only failed learnings are returned.
  - Unit test `retrieve.ts` to ensure every branch receives/uses filters and Exa is either filtered or labeled clearly.
  - Regression test against `memory.get_similar_failures` to confirm no successful memories leak into failure mode.

2) Make reflection failure modes explicit and fail-soft
- Why it matters: a 200-style intake without eventual learning is misleading for agents expecting continuous memory growth.
- Verify after fix:
  - Without `OPENAI_API_KEY`, `/sessions` returns actionable ingest status, and `retrieve_context` explicitly indicates degraded mode.
  - With valid key, successful reflection writes published learnings and `/sessions`/`/retrieve` transitions from empty results to usable results.

3) Improve onboarding/connection clarity for non-MCP-savvy clients
- Why it matters: zero-friction install is a core requirement; hidden transport/env requirements block first-run adoption.
- Verify after fix:
  - Fresh external operator can complete install from `agent-installation.md` only (no repo reads) and make first `initialize`, `retrieve_context`, and `dump_session` calls end-to-end.
  - Verify Accept/header requirements and exact auth header behavior are documented and mirrored by client snippets.

## Run Ledger

## Run 2026-03-06 14:00 PST

- Summary: Verified production MCP contract and install contract; confirmed paywall gating behavior; performed fresh local namespace run against API and worker.
- Purchase and connect: partial
- Retrieve before work: broken
- Similar failures during risk: broken
- Dump after work: partial
- Automatic improvement loop: broken
- Key evidence:
  - `curl -sS https://platon.bigf.me/agent-installation.md` returns installation instructions, identity guidance, and retrieval/dump loop.
  - `curl -sS https://platon.bigf.me/api/nevermined.json` returns plan and transport metadata with `payments.x402.getX402AccessToken` guidance and `x402` header convention.
  - `POST https://platon.bigf.me/mcp` with no Accept returns `406`.
  - MCP `tools/call` without auth returns `Authorization required`; with `Authorization: Bearer bogus-token` returns payment-required string.
  - Fresh local run (`127.0.0.1:3003` with internal auth): two `POST /sessions` calls accepted with `201`, `POST /retrieve` returned `200` with empty results.
  - Worker log repeatedly failed `OPENAI_API_KEY is required for model-backed reflection.` and DB rows for those sessions had `reflection_status = failed`.
- Root causes found:
  - `get_similar_failures` filters are applied at API payload layer but not to all retrieval paths.
  - Reflection hard-depends on `OPENAI_API_KEY`, and failures are not surfaced as user-visible degraded-memory mode.
  - MCP streamable transport expectations are strict (Accept header), not yet made fully frictionless in install guidance.
- Recommended next fixes:
  - Thread filters into all retrieval sources and gate/label Exa contributions for filtered failure queries.
  - Add explicit degradation messaging for failed reflection and a local-ops fallback path (or clearly document strict requirements).
  - Expand install contract with runnable transport profile and quick-connect checks for header/env prerequisites.
