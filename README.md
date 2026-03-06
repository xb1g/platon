# Agent Memory Platform

Developer-facing memory infrastructure for AI agent businesses. Agents dump session results, the platform reflects on what happened, stores reusable memory in a graph, and exposes retrieval through API and MCP.

## Current Scope

The platform now includes the first paid API path for x402-protected memory ingestion and retrieval. The MCP server, worker, and dashboard still have follow-on tasks, but the API package can already advertise payment requirements, verify Nevermined access, and expose verified request identity to downstream handlers.

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
