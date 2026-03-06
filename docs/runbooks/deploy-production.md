# Production Deploy Runbook

Use this runbook only for the production release stage.

## Release Gates

Production deploys are allowed only when all of the following are true:

- Tasks 1 through 12 in `docs/plans/2026-03-06-autonomous-agent-memory-production-plan.md` are marked `[x]`
- Task 13 is the active release task
- `main` is clean, verified, and pushed
- the latest staging rollout and smoke checks passed

If any gate is missing, stop. Do not “just deploy and see.”

## Branch Expectations

- Deploy production from `origin/main`
- Do not deploy directly from a `codex/*` branch or an unpushed local commit
- Confirm the exact release commit before proceeding:

```bash
git checkout main
git pull --ff-only origin main
git rev-parse --short HEAD
git status --short
```

## Push Commands

When the verified release commit is ready:

```bash
git push origin main
```

Wait for the push to complete successfully before triggering deployment.

## Deployment Command

Point `scripts/.env.deploy` at the production host and deploy from the repo root:

```bash
./scripts/deploy-ec2.sh
```

This command pulls the pushed commit on the target host and runs `./scripts/deploy-local.sh`.

## Post-Deploy Smoke Checks

Set the production base URL and run the release smoke sequence:

```bash
export PRODUCTION_BASE_URL="https://platon.bigf.me"
curl -fsS "${PRODUCTION_BASE_URL}/agent-installation.md" | grep -q "Install Platon memory for this agent."
curl -fsS "${PRODUCTION_BASE_URL}/api/health"
MEMORY_API_URL="${PRODUCTION_BASE_URL}/api" pnpm --filter @memory/api verify:nevermined
```

The production release is incomplete until these checks pass.

## Rollback Triggers

Trigger rollback immediately when any of these happen:

- the hosted install contract returns the wrong content or headers
- `/api/health` fails or degrades after deploy
- Nevermined 402 preflight or paid retry verification fails
- the MCP transport fails for valid paid requests
- PM2 does not bring all four services back healthy
- a regression would invalidate the Task 13 release gate

## Rollback Procedure

1. SSH to the production host.
2. Change into the deployed repo.
3. Identify the previous good release commit:

```bash
git log --oneline -n 10
```

4. Switch the host back to that commit and redeploy:

```bash
git checkout <last-good-commit>
./scripts/deploy-local.sh
```

5. Mark Task 13 as `[!]` in the production plan, append a blocker note, and include the failed release commit plus smoke-check output.
