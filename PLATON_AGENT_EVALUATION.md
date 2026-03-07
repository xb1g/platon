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
- Retrieve before work: partial
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

1) Finding: `memory.get_similar_failures` still returns non-failure memories in hosted production
- User impact: risk-time retrieval is not trustworthy, so agents can get successful or generic memories when they explicitly ask for past failures.
- Evidence and reproduction:
  - Fresh hosted `memory.get_similar_failures` call for `OPENAI_API_KEY is required for model-backed reflection` returned three successful or neutral memories, not failure-only results.
  - Raw hosted MCP `tools/call` for the same method on 2026-03-06 reproduced the same behavior.
  - Local repo state is better than the prior note suggested: `graphSearch` and `vectorSearch` both receive `filters`, and targeted local suites passed (`pnpm --filter @memory/api test -- tests/vector-search.test.ts tests/retrieve.test.ts tests/paywall.test.ts tests/retrieval-ranking.test.ts`).
- Root cause:
  - The remaining live contamination likely comes from unconditional Exa supplementation in `/retrieve`, or from hosted production lagging behind the current repo. This is an inference from code plus live behavior.
- Exact file references:
  - [retrieve.ts](/Users/bunyasit/dev/platon/apps/api/src/routes/retrieve.ts):36-75
  - [exa-search.ts](/Users/bunyasit/dev/platon/apps/api/src/lib/retrieval/exa-search.ts):20-66

2) Finding: Hosted direct HTTP API is not reliably usable with a valid x402 token
- User impact: non-MCP clients and fallback integrations cannot depend on the documented `POST /retrieve` and `POST /sessions` flow.
- Evidence and reproduction:
  - `GET https://platon.bigf.me/api/nevermined.json` returned `200` with configured hosted plan and agent metadata.
  - `POST https://platon.bigf.me/api/sessions` with the configured `PLATON_X402_ACCESS_TOKEN` returned `500 Internal Server Error` with `Failed to redeem credits. Failed to redeem credits`.
  - `POST https://platon.bigf.me/api/retrieve` with the same token returned `502 Bad Gateway` on one attempt and timed out on another bounded retry.
  - By contrast, hosted MCP `memory.dump_session` succeeded with the same token, so this is not simply an invalid-token case.
- Root cause:
  - The live failure mode appears to sit in the paid direct-API verify/settle path or an upstream dependency. That is an inference from the 500 body and the paywall hook structure.
- Exact file references:
  - [paywall.ts](/Users/bunyasit/dev/platon/apps/api/src/plugins/paywall.ts):210-275

3) Finding: Hosted MCP install guidance overstates the `Mcp-Session-Id` requirement
- User impact: first-run operators are told to capture and resend `Mcp-Session-Id`, but the hosted initialize response did not emit that header and later calls still succeeded without it.
- Evidence and reproduction:
  - Fresh `initialize` to `https://platon.bigf.me/mcp` with a valid bearer token returned `200` and no `Mcp-Session-Id` header on 2026-03-06.
  - A later hosted `memory.dump_session` call succeeded without sending `Mcp-Session-Id`.
  - The generated install contract still tells callers to read and reuse that header.
- Root cause:
  - The server creates StreamableHTTP transport with `sessionIdGenerator: undefined`, which is consistent with a sessionless flow.
- Exact file references:
  - [server.ts](/Users/bunyasit/dev/platon/apps/mcp/src/server.ts):335-345
  - [agent-installation.ts](/Users/bunyasit/dev/platon/apps/web/lib/agent-installation.ts):215-249

4) Finding: Automatic improvement still has an undocumented hard dependency on `OPENAI_API_KEY` in self-hosted reflection
- User impact: a self-hosted operator can satisfy the paid MCP prerequisites and still never generate learnings unless OpenAI model credentials are configured separately.
- Evidence and reproduction:
  - `OPENAI_API_KEY` is unset in this environment.
  - Fresh local reproduction on 2026-03-06: `pnpm --filter @memory/worker exec tsx --eval ... llmReflect(...)` exited with `OPENAI_API_KEY is required for model-backed reflection.`
  - The self-hosted prerequisite section documents `NVM_API_KEY`, `PLATON_INTERNAL_AUTH_TOKEN`, `NVM_ENVIRONMENT`, and `MEMORY_API_URL`, but not `OPENAI_API_KEY`.
- Root cause:
  - Reflection is model-backed and fails closed before any learning is produced when the OpenAI credential is absent.
- Exact file references:
  - [llm.ts](/Users/bunyasit/dev/platon/apps/worker/src/lib/llm.ts):52-59
  - [agent-installation.ts](/Users/bunyasit/dev/platon/apps/web/lib/agent-installation.ts):130-153

## Verdict Table

- purchase and connect: partial
- retrieve before work: partial
- similar failures during risk: broken
- dump after work: partial
- automatic improvement loop: broken

## Product Assessment

What is good enough to ship now:
- Hosted MCP onboarding is clearer than before: the install contract now includes stable identity rules, exact token acquisition guidance, and the required `Accept` header for StreamableHTTP.
- Hosted MCP itself is partially working in live use: `tools/list`, `initialize`, `memory.retrieve_context` (via the configured Codex MCP client), and `memory.dump_session` all succeeded during this run.
- Local repo coverage around retrieval filters and paywall behavior is reasonably strong: the targeted API and MCP test suites passed.

What should not be claimed yet:
- "Direct HTTP API works as the documented non-MCP fallback" is not safe to claim while `/api/sessions` is returning live 500s and `/api/retrieve` is unstable with a valid token.
- "Failed-memory lookup is failure-specific" is still not safe to claim, even though local filter wiring has improved, because hosted behavior still returns non-failure memories.
- "It automatically improves over time" is not safe to claim for self-hosted operators while reflection silently hard-depends on `OPENAI_API_KEY` and that prerequisite is not in the self-hosted startup section.

## Fix Plan

1) Stop mixing failure-filtered retrieval with unfiltered supplemental web results
- Why it matters: `memory.get_similar_failures` cannot help agents avoid repeated mistakes if success or web memories still leak into the result set.
- Verify after fix:
  - Run a hosted `memory.get_similar_failures` query against a known mixed corpus and confirm all returned memories are failure-scoped.
  - Add a regression test that covers `filters.statuses = ["failed"]` with Exa enabled and verifies no non-failure result is appended silently.

2) Repair the hosted direct API payment flow and add a real paid smoke check
- Why it matters: the documented non-MCP path is part of the product promise, and it is currently failing with a valid token.
- Verify after fix:
  - Paid `POST /api/retrieve` and `POST /api/sessions` succeed against production with the same token that already works through hosted MCP.
  - Extend the existing Nevermined smoke coverage so production-like paid retries catch redemption regressions before release.

3) Align MCP docs with actual transport behavior
- Why it matters: telling operators to depend on `Mcp-Session-Id` when the server behaves sessionlessly adds avoidable confusion to first-run setup.
- Verify after fix:
  - Either emit and require `Mcp-Session-Id` consistently, or remove that requirement from the contract and examples.
  - Re-run the hosted curl examples from `agent-installation.md` exactly as published.

4) Make reflection prerequisites explicit and fail-soft
- Why it matters: session ingestion without eventual learning is misleading for operators expecting automatic improvement.
- Verify after fix:
  - Self-hosted setup docs mention `OPENAI_API_KEY` wherever model-backed reflection is required.
  - Without the key, the product surfaces degraded-learning status clearly instead of implying normal memory growth.

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

## Run 2026-03-06 15:37 PST

- Summary: Re-ran the evaluation with fresh hosted production checks, targeted local tests, and a direct worker reflection reproduction.
- Purchase and connect: partial
- Retrieve before work: partial
- Similar failures during risk: broken
- Dump after work: partial
- Automatic improvement loop: broken
- Key evidence:
  - `codex mcp get platon` shows hosted StreamableHTTP MCP configured at `https://platon.bigf.me/mcp` via `PLATON_X402_ACCESS_TOKEN`.
  - `curl -si https://platon.bigf.me/mcp ... tools/list` without the required `Accept` header returned `406`, and the same call with `Accept: application/json, text/event-stream` returned the three memory tools.
  - Hosted `initialize` with the configured bearer token returned `200`, but no `Mcp-Session-Id` header was emitted.
  - Hosted `memory.dump_session` over MCP succeeded and ingested session `eval-2026-03-06-2335`.
  - Hosted `memory.get_similar_failures` for `OPENAI_API_KEY is required for model-backed reflection` returned successful or neutral memories instead of failure-only results.
  - Hosted direct HTTP `GET /api/nevermined.json` returned `200`, but paid `POST /api/sessions` returned `500 Failed to redeem credits. Failed to redeem credits`, and paid `POST /api/retrieve` was unstable (`502` once, timeout on bounded retry).
  - Fresh local targeted verification passed:
    - `pnpm --filter @memory/api test -- tests/vector-search.test.ts tests/retrieve.test.ts tests/paywall.test.ts tests/retrieval-ranking.test.ts`
    - `pnpm --filter @memory/mcp test -- tests/server.test.ts`
  - Fresh local worker reproduction with `OPENAI_API_KEY` unset failed immediately:
    - `pnpm --filter @memory/worker exec tsx --eval ... llmReflect(...)`
    - error: `OPENAI_API_KEY is required for model-backed reflection.`
- What changed since the prior run:
  - The old repo-local finding that vector retrieval ignored filters is stale; current code and tests show filter threading into graph and vector paths.
  - The live product is still failing the user-facing goal, but the most important fresh blockers are now direct-API payment instability, failure-query contamination, MCP doc mismatch around session headers, and undocumented reflection prerequisites.
- Recommended next fixes:
  - Filter or partition Exa contributions when callers ask for failure-only retrieval.
  - Repair paid direct API redemption and add a real paid smoke check that exercises `/api/retrieve` and `/api/sessions`.
  - Align the install contract with the actual session model of the hosted MCP transport.
  - Document `OPENAI_API_KEY` as a reflection prerequisite and surface degraded-learning mode explicitly.
