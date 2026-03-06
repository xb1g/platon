# Staging Deploy Runbook

Use this runbook for a verified staging rollout before the production release gate.

## Branch Expectations

- Deploy staging from `main` only after the target task has been reconciled into the primary branch.
- Do not deploy directly from `codex/*` worktree branches.
- Require a clean local tree before pushing:

```bash
git checkout main
git status --short
git pull --ff-only origin main
```

## Push Commands

Push the verified `main` commit that staging should run:

```bash
git push origin main
```

If the remote moved unexpectedly, stop and reconcile before deploying.

## Deployment Command

Configure `scripts/.env.deploy` with the staging host, SSH key, and repo path, then deploy from the repo root:

```bash
./scripts/deploy-ec2.sh
```

Use `./scripts/deploy-ec2.sh --pull-only` only when you intentionally want to sync code without restarting the services.

## Post-Deploy Smoke Checks

Set the staging base URL for the checks:

```bash
export STAGING_BASE_URL="https://<staging-host>"
```

Run these checks in order:

```bash
curl -fsS "${STAGING_BASE_URL}/agent-installation.md" | grep -q "Install Platon memory for this agent."
curl -fsS "${STAGING_BASE_URL}/api/health"
MEMORY_API_URL="${STAGING_BASE_URL}/api" pnpm --filter @memory/api verify:nevermined
```

The deploy is not healthy unless all three succeed.

## Rollback Triggers

Roll back immediately if any of these occur:

- the hosted markdown contract is missing or stale
- `/api/health` fails
- Nevermined verification fails on the paid retry path
- the MCP endpoint rejects valid `Authorization: Bearer <x402-access-token>` traffic
- PM2 fails to restart one of `memory-api`, `memory-mcp`, `memory-worker`, or `memory-web`

## Rollback Procedure

1. SSH to the staging host.
2. Change to the repo path configured in `scripts/.env.deploy`.
3. Identify the last known good commit:

```bash
git log --oneline -n 5
```

4. Reset the checkout to that commit and redeploy:

```bash
git checkout <last-good-commit>
./scripts/deploy-local.sh
```

5. Record the failed deploy in the plan or release notes before attempting another rollout.
