# Nevermined Stable SDK Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move Platon's Nevermined integration to the stable SDK surface and leave a reproducible verification path.

**Architecture:** Keep Nevermined at the public API and MCP boundary. Use facilitator verify/settle on the HTTP API, keep native Nevermined MCP tool registration, and expose OpenAPI metadata for registration/discovery.

**Tech Stack:** TypeScript, Fastify, MCP SDK, Nevermined Payments SDK, Vitest, Zod

---

### Task 1: Align registration metadata with stable Nevermined SDK

**Files:**
- Modify: `apps/api/src/scripts/register-nevermined-agent.ts`
- Test: `apps/api/tests/register.test.ts`

**Step 1: Write the failing test**

Assert that the registration payload uses documented endpoint mappings and includes `agentDefinitionUrl`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- --run tests/register.test.ts`

**Step 3: Write minimal implementation**

Export the registration payload builder, use endpoint maps like `{ POST: url }`, and add `agentDefinitionUrl` plus open endpoints.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- --run tests/register.test.ts`

### Task 2: Add a real API definition endpoint

**Files:**
- Modify: `apps/api/src/server.ts`
- Test: `apps/api/tests/server.test.ts`

**Step 1: Write the failing test**

Assert that `GET /openapi.json` returns a minimal OpenAPI document with `/sessions` and `/retrieve`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- --run tests/server.test.ts`

**Step 3: Write minimal implementation**

Add `GET /openapi.json` to the API server and return a stable OpenAPI document.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- --run tests/server.test.ts`

### Task 3: Migrate HTTP paywall to facilitator verify/settle

**Files:**
- Modify: `apps/api/src/plugins/paywall.ts`
- Modify: `apps/api/tests/paywall.test.ts`
- Modify: `apps/api/tests/sessions.test.ts`
- Modify: `apps/api/tests/retrieve.test.ts`

**Step 1: Write the failing test**

Update tests to expect the stable facilitator-based payment flow and subscriber-derived identity.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test`

**Step 3: Write minimal implementation**

Swap the legacy request API calls for `facilitator.verifyPermissions()` and `facilitator.settlePermissions()`. Keep app-level `agentId` and `agentKind` as request-scoped namespace selectors inside the verified subscriber context.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test`

### Task 4: Add local smoke verification flow

**Files:**
- Add: `apps/api/src/scripts/verify-nevermined-smoke.ts`
- Add: `apps/api/tests/verify-nevermined-smoke.test.ts`
- Modify: `apps/api/package.json`
- Modify: `.env.example`
- Modify: `docs/runbooks/nevermined-setup.md`

**Step 1: Write the failing test**

Assert that the smoke script exports stable env parsing and a default retrieve payload.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- --run tests/verify-nevermined-smoke.test.ts`

**Step 3: Write minimal implementation**

Add a smoke script that verifies the `402` challenge on `/retrieve`, and if subscriber credentials exist, performs a paid retry with a fresh x402 token.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- --run tests/verify-nevermined-smoke.test.ts`

### Task 5: Upgrade and verify stable SDK

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/mcp/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/mcp/src/server.ts`
- Modify: `apps/api/tests/auth.test.ts`

**Step 1: Upgrade dependency**

Set `@nevermined-io/payments` to `1.1.6` in API and MCP packages, then run install.

**Step 2: Fix compile drift**

Update type-only mismatches introduced by the stable SDK.

**Step 3: Run full verification**

Run:

```bash
pnpm --filter @memory/api typecheck
pnpm --filter @memory/mcp typecheck
pnpm --filter @memory/api test
pnpm --filter @memory/mcp test
```
