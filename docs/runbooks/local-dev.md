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
