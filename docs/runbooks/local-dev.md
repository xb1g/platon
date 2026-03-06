# Local Development Guide

## Prerequisites
- Docker and Docker Compose
- Node.js 20+
- pnpm

## Starting the Environment
1. Start infrastructure: `docker compose up -d`
2. Install dependencies: `pnpm install`
3. Start all services: `pnpm dev`

## Telemetry and Audit
- API logs are structured JSON
- Worker logs include job IDs
- Audit events are available at `/audit`

## Live E2E Smoke
1. Start infrastructure: `docker compose up -d`
2. Start API and worker in separate terminals:
   - `PLATON_INTERNAL_AUTH_TOKEN=local-smoke PLATON_ALLOW_INTERNAL_AUTH_BYPASS=1 pnpm --filter @memory/api dev`
   - `pnpm --filter @memory/worker dev`
3. Run smoke test: `SMOKE_INTERNAL_AUTH_TOKEN=local-smoke pnpm --filter @memory/api test:e2e:smoke`
4. Run smoke script directly: `SMOKE_INTERNAL_AUTH_TOKEN=local-smoke pnpm --filter @memory/api smoke:e2e`

If paywall is enabled with Nevermined config, provide a valid `SMOKE_PAYMENT_SIGNATURE` token instead of bypass mode.
