# Deployment Guide

## Prerequisites
- Docker and Docker Compose
- Node.js 20+
- pnpm

## Steps
1. Clone the repository
2. Copy `.env.example` to `.env` and configure variables
3. Run `docker compose up -d` to start infrastructure
4. Run `pnpm install`
5. Run `pnpm build`
6. Start services:
   - API: `pnpm --filter @memory/api start`
   - MCP: `pnpm --filter @memory/mcp start`
   - Worker: `pnpm --filter @memory/worker start`
   - Web: `pnpm --filter @memory/web start`
