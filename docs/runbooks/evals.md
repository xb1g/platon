# Benchmark Harness Runbook

This runbook captures how to run benchmark tasks and inspect eval output for baseline vs memory modes.

## Prerequisites

- API dependencies available locally if a real retrieval runner is introduced later.
- Current defaults are deterministic and return an empty result without external services.

## Run Task-8 benchmark suite

Use the module API from tests or scripts.

- No-memory mode + memory-enabled mode:
  - `pnpm --filter @memory/api test -- run-benchmark.test.ts`

## Expected interpretation

- `baseline.metrics` is the control mode without memory assistance.
- `memory.metrics` is the memory-enabled mode under comparison.
- `lift.avgResultCount` and `lift.avgConfidence` show directional deltas.
- Any run that raises `Harmful retrieval rate ... exceeds threshold ...` should be investigated before release.

## Extending the harness

1. Add tasks to `apps/api/src/evals/benchmark-tasks.ts`.
2. Replace the injected task runner with a deterministic memory-backed implementation.
3. Tighten thresholds or reporting in `apps/api/src/evals/score-run.ts`.

