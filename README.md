# Agent Memory Platform

Developer-facing memory infrastructure for AI agent businesses. Agents dump session results, the platform reflects on what happened, stores reusable memory in a graph, and exposes retrieval through API and MCP.

## Current Scope

The platform now includes paid x402 access for both the HTTP API and the HTTP MCP server. The MCP package uses native Nevermined paywall protection for memory tools, and forwards paid calls to the API through a trusted internal hop that avoids double settlement.

The canonical hosted installation contract for operators and autonomous agents lives at `https://platon.bigf.me/agent-installation.md`. The homepage install panel and hosted markdown route are driven from the same shared source so agents can bootstrap from a stable URL instead of repo-specific prose.

## Workspace Layout

- `apps/api` - ingestion and retrieval API package boundary
- `apps/mcp` - MCP integration package boundary
- `apps/web` - developer dashboard package boundary
- `apps/worker` - reflection worker package boundary
- `packages/shared` - shared schemas, clients, and config helpers
- `docs/plans` - approved architecture and implementation docs

## Quick Start

1. Copy `.env.example` to `.env`
2. Run `pnpm install`
3. Run `pnpm check:workspace`
4. Register the API agent and credit plan with `pnpm --filter @memory/api register:nevermined`

## Hosted Agent Installation

When you are wiring Platon into another agent runtime, start with the hosted contract:

1. Tell the agent or operator to read `https://platon.bigf.me/agent-installation.md`
2. Keep `agentKind` and `agentId` stable across runs
3. Retrieve context immediately at task startup, retrieve again when the task shifts into a new bounded subtask, and dump a session after each task
4. Use `Authorization: Bearer <x402-access-token>` for remote MCP and `payment-signature: <x402-access-token>` for direct HTTP calls

## Local Boot Sequence

1. Ensure infra services are running: `docker compose up -d`
2. Start the workspace (API, MCP server, worker, UI) via `pnpm dev`
3. Exercise core flows: session ingestion, reflection job, retrieval request
4. Refer to `docs/runbooks/deploy.md` for troubleshooting and orchestration tips.

## Environment Variables

Environment configuration is centralized in `.env.example`. Populate the following before running the platform:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string with pgvector enabled |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Graph metadata store credentials |
| `REDIS_URL` | BullMQ queue connection |
| `MCP_SERVER_HOST`, `MCP_SERVER_PORT` | Host and port for the MCP bridge |
| `PLATON_INTERNAL_AUTH_TOKEN` | Shared secret used by the paid MCP server when forwarding verified calls to the API without double-charging |
| `NVM_API_KEY`, `NVM_ENVIRONMENT` | Nevermined API key and target environment |
| `NVM_PLAN_ID`, `NVM_AGENT_ID` | Runtime plan and agent identifiers used in x402 headers |
| `BUILDER_ADDRESS` | Wallet address that receives plan revenue during registration |
| `API_PUBLIC_URL` | Public base URL advertised during agent registration |

Refer to [docs/runbooks/nevermined-x402-flow.md](/Users/bunyasit/dev/platon/.worktrees/codex-nevermined-x402-engineer-a/docs/runbooks/nevermined-x402-flow.md) for the end-to-end subscriber flow and [docs/runbooks/nevermined-setup.md](/Users/bunyasit/dev/platon/.worktrees/codex-nevermined-x402-engineer-a/docs/runbooks/nevermined-setup.md) for setup details.

## Tooling

- `pnpm` workspaces for package management
- `turbo` for orchestration
- `TypeScript` as the shared language baseline
- per-package `tsconfig.json` files to keep build ownership local

## Notes For Follow-On Tasks

- Task 2 should own `packages/shared/src`
- Task 3 should own local infra and `apps/api`
- Task 4 should own `apps/worker`
- Task 5 should own `apps/mcp`
- The dashboard can be added after the service layer is stable

The architecture and product docs live in `docs/plans/`.

## Runbooks

- `docs/runbooks/executor-cron.md` explains how the autonomous executor should advance the production plan one task at a time.
- `docs/runbooks/deploy-staging.md` covers verified staging pushes, deploy commands, smoke checks, and rollback triggers.
- `docs/runbooks/deploy-production.md` covers the stricter production release path that Task 13 must follow.
