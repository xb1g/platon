# Deployment Guide

Use this runbook for the first working release path: push a verified branch, deploy the current services, then run smoke and benchmark checks. Keep the flow simple. Do not add overnight-only gates here.

## Required Environment

Local workstation:

- Docker and Docker Compose
- Node.js 22+
- pnpm
- `git` access to the target remote

Deployed host or target shell:

- `.env` populated with runtime secrets
- PM2 installed
- Docker available for Postgres, Redis, and Neo4j

Repo variables that must be configured before deploy:

- `DATABASE_URL`
- `REDIS_URL`
- `NEO4J_URL`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `PLATON_INTERNAL_AUTH_TOKEN`
- `PLATON_ALLOW_INTERNAL_AUTH_BYPASS=1` for controlled smoke environments only

## Pre-Deploy Checklist

From the repo root:

```bash
git checkout main
git status --short
git pull --ff-only origin main
pnpm install
pnpm --filter @memory/api test -- security.test.ts auth.test.ts retrieve.test.ts sessions.test.ts
pnpm --filter @memory/api test -- run-benchmark.test.ts
```

Do not deploy if `git status --short` is dirty or if either verification command fails.

## Push Commands

When the verified `main` commit is ready:

```bash
git push origin main
```

If the remote moved unexpectedly, stop and reconcile before deploying.

## Deploy Command

For a local or single-host rollout from the repo root:

```bash
./scripts/deploy-local.sh
```

This command:

1. loads `.env`
2. starts infrastructure with `docker compose up -d`
3. runs `pnpm install`
4. runs `pnpm build`
5. restarts `memory-api`, `memory-mcp`, `memory-worker`, and `memory-web` with PM2

## Post-Deploy Smoke

Run the live smoke and benchmark checks after the deploy succeeds:

```bash
pnpm --filter @memory/api test:e2e:smoke
pnpm --filter @memory/api test -- run-benchmark.test.ts
```

Expected outcome:

- the live session-retrieval smoke passes
- benchmark harness remains green
- PM2 shows all four processes online

## Rollback Triggers

Roll back immediately if any of the following happen:

- `./scripts/deploy-local.sh` exits non-zero
- `pnpm --filter @memory/api test:e2e:smoke` fails
- `pnpm --filter @memory/api test -- run-benchmark.test.ts` fails after deploy
- PM2 fails to restart `memory-api`, `memory-mcp`, `memory-worker`, or `memory-web`

## Rollback Procedure

1. Identify the last known good commit:

```bash
git log --oneline -n 5
```

2. Reset the deployed checkout to that commit:

```bash
git checkout <last-good-commit>
```

3. Re-run the deploy:

```bash
./scripts/deploy-local.sh
```

4. Re-run the smoke command:

```bash
pnpm --filter @memory/api test:e2e:smoke
```
