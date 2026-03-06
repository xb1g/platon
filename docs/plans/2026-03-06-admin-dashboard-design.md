# Admin Dashboard Design

**Date:** 2026-03-06

## Goal

Add a real read-only admin dashboard to `apps/web` that is protected by a password login, defaults to password `bigf`, and exposes live Platon storage state across Postgres, Neo4j, and Redis without using mock data.

## Scope

This design covers:

- Password-protected `/admin` access in the Next.js web app
- Server-only auth and cookie handling
- Live overview metrics from real backends
- Read-only browsing for sessions and related Postgres tables
- Read-only graph inspection for Neo4j memory data
- Read-only queue and backend health inspection for Redis/BullMQ
- Error handling for unavailable backends
- Verification strategy for auth guards and live data rendering

This design does not cover:

- Record editing or deletion
- Arbitrary SQL or Cypher consoles
- Changes to the existing mock product dashboard routes
- Multi-user admin roles or per-user accounts

## Product Decisions

- The admin area is separate from the existing app dashboard and marketing surfaces.
- The first version is strictly read-only.
- The effective password is `bigf`, but the code should read it from one server-side config point with a default fallback.
- The admin area must show real backend data or real backend errors, never placeholders.
- The admin browser should expose operational visibility, not unrestricted database query power.

## Current Context

- `apps/web` currently renders dashboard and sessions pages from `lib/mock-data.ts`.
- `apps/api` already persists live `raw_sessions` in Postgres.
- Retrieval feedback and vector memory metadata are also stored in Postgres.
- Neo4j holds memory graph data for sessions and learnings.
- Redis and BullMQ are already used for the reflection queue.

## Architecture

### Route structure

Add a dedicated `/admin` section in `apps/web` with:

- `/admin/login`
- `/admin`
- `/admin/sessions`
- `/admin/sessions/[id]`
- `/admin/database`
- `/admin/graph`

Protected routes should live behind a server-side auth guard so unauthenticated requests redirect to `/admin/login`.

### Auth model

Use a password form at `/admin/login`. Successful login sets an `httpOnly` session cookie with:

- `sameSite=lax`
- `secure` only in production
- a signed token generated server-side

The browser never stores the password itself. All verification stays in server code.

### Data access model

Admin pages should query live infrastructure directly from server-only helpers in `apps/web`:

- Postgres for session rows, feedback rows, and vector metadata
- Neo4j for graph summary and recent node or relationship samples
- Redis or BullMQ for reflection queue health and recent job state

This avoids building a second large admin API before the dashboard exists.

## Data Flow And Security

### Login flow

1. User visits `/admin/login`.
2. User submits the password.
3. Server compares it with `process.env.ADMIN_PASSWORD ?? "bigf"`.
4. On success, server sets a signed admin session cookie and redirects to `/admin`.
5. On failure, the login page renders a plain invalid-password error.

### Protected rendering

Every `/admin` page checks auth in server code before loading backend data. Requests without a valid cookie redirect to `/admin/login`.

### Backend access boundaries

- All backend connections remain server-only.
- No admin credentials or database strings are sent to the client.
- The UI renders sanitized operational summaries plus selected raw records.
- Pages fail closed: no valid cookie means no access.

### Read-only database browser

The Postgres browser should start with known tables that matter to operators:

- `raw_sessions`
- `retrieval_feedback`
- `memory_vectors`

For each table, show:

- row count
- key columns
- paged records
- lightweight filters where useful

No free-form SQL console is included in this version.

### Read-only graph browser

The Neo4j browser should expose:

- node label counts
- relationship type counts
- recent session and learning nodes
- recent relationships relevant to memory and namespace structure

No write queries or arbitrary Cypher editor is included in this version.

### Read-only queue browser

The Redis or BullMQ view should expose:

- reflection queue name
- waiting, active, completed, and failed counts
- a few recent jobs with payload summaries

No retry, purge, or mutation controls are included.

## UX And Error Handling

### Admin interface

The admin UI should look operational and distinct from the polished marketing and demo dashboard routes. It should prioritize density, clarity, and live state over motion-heavy storytelling.

Primary tabs:

- Overview
- Sessions
- Database
- Graph

### Overview page

Show backend health first, then high-signal live metrics such as:

- total raw sessions
- recent failed sessions
- distinct agents
- latest ingestion timestamps
- retrieval feedback count
- vector record count
- reflection queue depth

### Sessions page

Support real search and pagination over `raw_sessions` by:

- `subscriber_id`
- `agent_kind`
- `agent_id`
- `session_id`
- outcome status
- reflection status

### Session detail page

Show:

- core session metadata
- stored payload JSON
- reflection status and timestamps
- related retrieval feedback if available

### Partial backend failure behavior

If one backend is unavailable, the page still renders and that section shows the real error message in a bounded error panel. The rest of the page continues rendering from the available backends.

## Verification

Verification should prove:

- unauthenticated admin routes redirect to `/admin/login`
- valid password login sets the auth cookie
- invalid password does not set a cookie
- protected admin pages render live Postgres session rows
- session detail renders a real stored payload
- overview metrics use real backend queries
- Postgres, Neo4j, and Redis failures are surfaced without falling back to mock data

## Success Criteria

- `/admin` is protected by a password login with default password `bigf`
- the admin area reads real data from live backends
- operators can browse sessions and core storage state without touching mock data
- database and graph inspection remain read-only
- backend outages are visible as real errors, not hidden behind placeholders
