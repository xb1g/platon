# Bug: Reflection cannot produce durable memory when worker `OPENAI_API_KEY` is missing

## Summary
`POST /sessions` persists raw sessions and returns `201`, but reflection happens asynchronously. In deployments where the API can ingest sessions and the worker lacks `OPENAI_API_KEY`, the queued reflection job later fails and no durable learnings are written.

## Severity
High

## Impact
`memory.dump_session` appears healthy at ingest time, but the system does not improve over time because accepted sessions never turn into reusable reflections. This is especially easy to miss in split deployments where API and worker env vars drift.

## Evidence and Reproduction
- The API route stores the raw session, enqueues the reflection job, and returns `201` with a queued-style status before reflection runs:
  - [apps/api/src/routes/sessions.ts](file:///Users/bunyasit/dev/platon/apps/api/src/routes/sessions.ts)
- The worker reflection client throws immediately when `OPENAI_API_KEY` is absent:
  - [apps/worker/src/lib/llm.ts](file:///Users/bunyasit/dev/platon/apps/worker/src/lib/llm.ts):55-59
- The worker persists async failure state by marking the raw session as failed and storing `reflection_error`:
  - [apps/worker/src/lib/session-store.ts](file:///Users/bunyasit/dev/platon/apps/worker/src/lib/session-store.ts)
- Local reproduction on a fresh namespace (`127.0.0.1:3003`) with internal auth bypass and a worker missing `OPENAI_API_KEY`:
  1. `POST /sessions` for both success and failed payloads returned `201` with a queued status.
  2. Worker logs showed repeated `OPENAI_API_KEY is required for model-backed reflection.` failures.
  3. Corresponding `raw_sessions` rows moved to `reflection_status = failed` with matching `reflection_error`.
  4. Because reflection never completed, follow-up retrieval had no newly reflected memory to return for that namespace.

## Root cause
- Ingestion and reflection are decoupled. `POST /sessions` confirms persistence and queueing, not successful reflection.
- Worker reflection is hard-gated on `OPENAI_API_KEY` and throws before any stable learning is written:
  - [apps/worker/src/lib/llm.ts](file:///Users/bunyasit/dev/platon/apps/worker/src/lib/llm.ts)
- There is no preflight or degraded-mode signal that tells operators the reflection backend is unavailable before accepted jobs begin failing asynchronously.

## Suggested fix
1. Keep the ingest `status`, but add an explicit degraded-mode signal for reflection readiness, such as startup validation, a health flag, or a warning when the reflection backend is unavailable.
2. Add worker coverage for the missing-`OPENAI_API_KEY` path so the failed-state contract stays observable and intentional.
3. Add deployment docs that distinguish API-side model requirements from worker-side model requirements so split-process setups provision both correctly.
