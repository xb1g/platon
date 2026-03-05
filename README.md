# Agent Memory Platform

Developer-facing memory infrastructure for AI agent businesses. Agents dump session results, the platform reflects on what happened, stores reusable memory in a graph, and exposes retrieval through API and MCP.

## Current Scope

This repository is intentionally scaffolded through **Task 1 only**. It provides a clean monorepo, shared package boundaries, environment conventions, and installable workspace setup. Application code for the API, MCP server, worker, shared schemas, and web dashboard should be added in later tasks.

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
| `NEVERMINED_RPC_URL`, `NEVERMINED_WALLET_PRIVATE_KEY` | Nevermined metering RPC and key |

Refer to `docs/runbooks/nevermined-setup.md` for provider-specific onboarding before using metered endpoints.

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
