# Admin Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a password-protected, read-only `/admin` area in `apps/web` that shows live Platon data from Postgres, Neo4j, and Redis instead of mock dashboard content.

**Architecture:** The admin area lives entirely inside the Next.js web app and uses server-only helpers for auth and backend reads. Admin routes are protected by a signed cookie, overview pages aggregate live backend health, and dedicated routes expose session browsing plus read-only Postgres and Neo4j inspection without adding write capabilities.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, server actions or route handlers, Node `crypto`, pg/Postgres, neo4j-driver, BullMQ, ioredis, Vitest

---

### Task 1: Add web package dependencies and admin config primitives

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/web/package.json`
- Create: `/Users/bunyasit/dev/platon/apps/web/lib/admin/config.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-config.test.ts`

**Step 1: Write the failing test**

Add `admin-config.test.ts` asserting:

- default admin password resolves to `"bigf"`
- missing signing secret falls back to a deterministic dev-safe value or throws in production, depending on the chosen config contract
- backend URLs come from server env, not client env

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-config.test.ts`
Expected: FAIL because the admin config module does not exist yet.

**Step 3: Write minimal implementation**

- Add backend client dependencies needed by the web app: `pg`, `neo4j-driver`, `bullmq`, and `ioredis`
- Create `lib/admin/config.ts` with helpers for:
  - `getAdminPassword()`
  - `getAdminCookieSecret()`
  - `isProductionAdminCookie()`
  - backend connection env access

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-config.test.ts`
Expected: PASS with config defaults and env handling verified.

**Step 5: Commit**

```bash
git add apps/web/package.json apps/web/lib/admin/config.ts apps/web/tests/admin-config.test.ts
git commit -m "feat: add admin dashboard config primitives"
```

### Task 2: Build signed-cookie admin auth helpers

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/lib/admin/auth.ts`
- Create: `/Users/bunyasit/dev/platon/apps/web/lib/admin/auth-cookie.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-auth.test.ts`

**Step 1: Write the failing test**

Add tests covering:

- password verification accepts `"bigf"` by default
- generated auth cookies can be verified server-side
- tampered cookies are rejected
- expired cookies are rejected

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-auth.test.ts`
Expected: FAIL because no auth helper exists yet.

**Step 3: Write minimal implementation**

Use Node `crypto` HMAC signing for a compact cookie payload containing:

- issued-at timestamp
- expiry timestamp
- admin marker

Expose helpers such as:

- `verifyAdminPassword(password: string)`
- `createAdminSessionCookie()`
- `readAdminSessionCookie()`
- `clearAdminSessionCookie()`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-auth.test.ts`
Expected: PASS with positive, tampered, and expired-cookie coverage.

**Step 5: Commit**

```bash
git add apps/web/lib/admin/auth.ts apps/web/lib/admin/auth-cookie.ts apps/web/tests/admin-auth.test.ts
git commit -m "feat: add signed admin auth cookies"
```

### Task 3: Add the admin login route and logout flow

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/login/page.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/actions.ts`
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/login/submit-button.tsx`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-login-page.test.tsx`

**Step 1: Write the failing test**

Add tests asserting:

- the login page renders a password field
- invalid password returns an inline error
- valid password triggers cookie creation and redirects to `/admin`

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-login-page.test.tsx`
Expected: FAIL because the route and action do not exist yet.

**Step 3: Write minimal implementation**

- Create the login page UI
- Add a server action for login and logout
- On success, set the signed cookie
- On failure, return a plain invalid-password state

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-login-page.test.tsx`
Expected: PASS with redirect and invalid-password behavior verified.

**Step 5: Commit**

```bash
git add apps/web/app/admin/login/page.tsx apps/web/app/admin/actions.ts apps/web/app/admin/login/submit-button.tsx apps/web/tests/admin-login-page.test.tsx
git commit -m "feat: add admin login flow"
```

### Task 4: Guard admin routes with server-side auth

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/(protected)/layout.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/middleware.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-guard.test.ts`

**Step 1: Write the failing test**

Add tests asserting:

- `/admin` redirects to `/admin/login` without a valid cookie
- `/admin/login` remains publicly reachable
- valid cookies allow protected admin rendering

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-guard.test.ts`
Expected: FAIL because the admin guard does not exist yet.

**Step 3: Write minimal implementation**

- Add middleware or protected layout logic that checks the signed admin cookie
- Redirect unauthenticated requests to `/admin/login`
- Exclude static assets and the login page from protection

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-guard.test.ts`
Expected: PASS with redirect behavior proven.

**Step 5: Commit**

```bash
git add apps/web/app/admin/(protected)/layout.tsx apps/web/middleware.ts apps/web/tests/admin-guard.test.ts
git commit -m "feat: guard admin routes with signed auth"
```

### Task 5: Add server-only backend clients and live admin queries

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/lib/admin/postgres.ts`
- Create: `/Users/bunyasit/dev/platon/apps/web/lib/admin/neo4j.ts`
- Create: `/Users/bunyasit/dev/platon/apps/web/lib/admin/redis.ts`
- Create: `/Users/bunyasit/dev/platon/apps/web/lib/admin/queries.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-queries.test.ts`

**Step 1: Write the failing test**

Add tests for query helpers that expect:

- overview metrics derived from real query results
- session list filters mapped to SQL parameters
- graceful normalization of backend errors into UI-safe error objects

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-queries.test.ts`
Expected: FAIL because the backend client and query modules do not exist yet.

**Step 3: Write minimal implementation**

Create server-only helpers for:

- Postgres session counts and paged `raw_sessions` queries
- Postgres counts for `retrieval_feedback` and `memory_vectors`
- Neo4j label and relationship summaries
- BullMQ or Redis queue counts for `reflection-queue`

Return plain serializable objects for server components.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-queries.test.ts`
Expected: PASS with live-query shaping covered.

**Step 5: Commit**

```bash
git add apps/web/lib/admin/postgres.ts apps/web/lib/admin/neo4j.ts apps/web/lib/admin/redis.ts apps/web/lib/admin/queries.ts apps/web/tests/admin-queries.test.ts
git commit -m "feat: add live admin backend queries"
```

### Task 6: Build the admin shell and overview page

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/(protected)/layout.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/(protected)/page.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/admin-shell.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/admin-metric-card.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/backend-status-panel.tsx`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-overview-page.test.tsx`

**Step 1: Write the failing test**

Add a page test asserting the overview renders:

- live metric labels
- backend health panels
- no `mockSessions` or `mockLearnings` imports

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-overview-page.test.tsx`
Expected: FAIL because the admin overview route does not exist yet.

**Step 3: Write minimal implementation**

- Create the shared admin shell with tab navigation
- Render overview metrics from `lib/admin/queries.ts`
- Render backend health boxes and queue depth

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-overview-page.test.tsx`
Expected: PASS with live-data overview rendering.

**Step 5: Commit**

```bash
git add apps/web/app/admin/(protected)/layout.tsx apps/web/app/admin/(protected)/page.tsx apps/web/components/admin/admin-shell.tsx apps/web/components/admin/admin-metric-card.tsx apps/web/components/admin/backend-status-panel.tsx apps/web/tests/admin-overview-page.test.tsx
git commit -m "feat: add admin overview dashboard"
```

### Task 7: Add a live sessions browser with filters and pagination

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/(protected)/sessions/page.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/session-filter-form.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/admin-session-table.tsx`
- Modify: `/Users/bunyasit/dev/platon/apps/web/lib/admin/queries.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-sessions-page.test.tsx`

**Step 1: Write the failing test**

Add tests asserting the sessions page:

- renders rows from live query results
- applies filters for `subscriber_id`, `agent_kind`, `agent_id`, `session_id`, `outcome_status`, and `reflection_status`
- shows pagination controls when more rows exist

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-sessions-page.test.tsx`
Expected: FAIL because the admin sessions route and filter wiring do not exist yet.

**Step 3: Write minimal implementation**

- Build a server-rendered sessions page
- Read search params into query filters
- Render paged `raw_sessions` rows with reflection metadata

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-sessions-page.test.tsx`
Expected: PASS with real filter mapping and pagination behavior.

**Step 5: Commit**

```bash
git add apps/web/app/admin/(protected)/sessions/page.tsx apps/web/components/admin/session-filter-form.tsx apps/web/components/admin/admin-session-table.tsx apps/web/lib/admin/queries.ts apps/web/tests/admin-sessions-page.test.tsx
git commit -m "feat: add live admin session browser"
```

### Task 8: Add a session detail inspector for stored payload JSON

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/(protected)/sessions/[id]/page.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/session-detail-card.tsx`
- Modify: `/Users/bunyasit/dev/platon/apps/web/lib/admin/queries.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-session-detail-page.test.tsx`

**Step 1: Write the failing test**

Add tests asserting the detail page:

- loads the selected `raw_sessions` row by id
- renders metadata fields and the stored `payload_json`
- shows a not-found state for missing ids

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-session-detail-page.test.tsx`
Expected: FAIL because the detail route does not exist yet.

**Step 3: Write minimal implementation**

- Add a query helper for single-session lookup
- Render metadata, outcome, reflection fields, and formatted JSON payload
- Link back to the sessions browser

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-session-detail-page.test.tsx`
Expected: PASS with single-session inspection covered.

**Step 5: Commit**

```bash
git add apps/web/app/admin/(protected)/sessions/[id]/page.tsx apps/web/components/admin/session-detail-card.tsx apps/web/lib/admin/queries.ts apps/web/tests/admin-session-detail-page.test.tsx
git commit -m "feat: add admin session detail inspector"
```

### Task 9: Add the read-only database browser

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/(protected)/database/page.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/database-browser.tsx`
- Modify: `/Users/bunyasit/dev/platon/apps/web/lib/admin/queries.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-database-page.test.tsx`

**Step 1: Write the failing test**

Add tests asserting the database page:

- shows `raw_sessions`, `retrieval_feedback`, and `memory_vectors`
- renders row counts and sample rows from real query results
- does not expose any mutation controls or SQL input box

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-database-page.test.tsx`
Expected: FAIL because the database browser does not exist yet.

**Step 3: Write minimal implementation**

- Add query helpers for per-table counts and sample rows
- Render one read-only section per table
- Keep output bounded with fixed page sizes

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-database-page.test.tsx`
Expected: PASS with real table inspection and no mutation affordances.

**Step 5: Commit**

```bash
git add apps/web/app/admin/(protected)/database/page.tsx apps/web/components/admin/database-browser.tsx apps/web/lib/admin/queries.ts apps/web/tests/admin-database-page.test.tsx
git commit -m "feat: add admin database browser"
```

### Task 10: Add the Neo4j graph browser and queue-health panels

**Files:**
- Create: `/Users/bunyasit/dev/platon/apps/web/app/admin/(protected)/graph/page.tsx`
- Create: `/Users/bunyasit/dev/platon/apps/web/components/admin/graph-browser.tsx`
- Modify: `/Users/bunyasit/dev/platon/apps/web/lib/admin/queries.ts`
- Test: `/Users/bunyasit/dev/platon/apps/web/tests/admin-graph-page.test.tsx`

**Step 1: Write the failing test**

Add tests asserting the graph page:

- shows label counts and relationship counts from Neo4j query results
- shows recent memory node or edge samples
- shows queue health summaries without mutation controls

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-graph-page.test.tsx`
Expected: FAIL because the graph page does not exist yet.

**Step 3: Write minimal implementation**

- Query Neo4j for summary counts and recent graph samples
- Query BullMQ or Redis for reflection queue counts
- Render both in a read-only operational page

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-graph-page.test.tsx`
Expected: PASS with live graph and queue summary rendering.

**Step 5: Commit**

```bash
git add apps/web/app/admin/(protected)/graph/page.tsx apps/web/components/admin/graph-browser.tsx apps/web/lib/admin/queries.ts apps/web/tests/admin-graph-page.test.tsx
git commit -m "feat: add admin graph and queue browser"
```

### Task 11: Prove graceful degradation and document admin env requirements

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/web/README.md`
- Modify: `/Users/bunyasit/dev/platon/.env.example`
- Modify: `/Users/bunyasit/dev/platon/apps/web/tests/admin-queries.test.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/web/tests/admin-overview-page.test.tsx`

**Step 1: Write the failing test**

Extend tests to assert backend failures render explicit error panels and do not fall back to mock values.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin-queries.test.ts tests/admin-overview-page.test.tsx`
Expected: FAIL because the current admin query and overview code will not yet surface all failure states.

**Step 3: Write minimal implementation**

- Normalize backend errors into serializable display objects
- Render error panels on overview, database, and graph pages
- Document `ADMIN_PASSWORD`, cookie secret, and backend connection requirements in the repo docs

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin-queries.test.ts tests/admin-overview-page.test.tsx`
Expected: PASS with explicit degraded-state rendering.

**Step 5: Commit**

```bash
git add apps/web/README.md .env.example apps/web/tests/admin-queries.test.ts apps/web/tests/admin-overview-page.test.tsx
git commit -m "docs: document admin dashboard runtime requirements"
```

### Task 12: Run full verification for the admin dashboard slice

**Files:**
- Verify only: `/Users/bunyasit/dev/platon/apps/web`

**Step 1: Run targeted test suite**

Run: `npm test -- tests/admin-config.test.ts tests/admin-auth.test.ts tests/admin-login-page.test.tsx tests/admin-guard.test.ts tests/admin-queries.test.ts tests/admin-overview-page.test.tsx tests/admin-sessions-page.test.tsx tests/admin-session-detail-page.test.tsx tests/admin-database-page.test.tsx tests/admin-graph-page.test.tsx`
Expected: PASS with no failing admin coverage.

**Step 2: Run broader web verification**

Run: `npm test`
Expected: PASS for the full web package test suite.

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS with no admin type errors.

**Step 4: Commit verification-safe final state**

```bash
git add apps/web
git commit -m "feat: add live read-only admin dashboard"
```
