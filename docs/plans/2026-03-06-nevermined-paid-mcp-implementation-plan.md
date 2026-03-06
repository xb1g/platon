# Nevermined-Paid MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the custom MCP payment verification flow with native Nevermined MCP monetization for Platon's three memory tools.

**Architecture:** The MCP server uses Nevermined's MCP integration to register and protect tools directly. Tool handlers keep the canonical Platon payloads and forward work to the HTTP API, while Nevermined owns payment-required responses, token verification, and credit redemption.

**Tech Stack:** TypeScript, MCP SDK, @nevermined-io/payments, Zod, Vitest

---

### Task 1: Lock the MCP paywall contract in tests

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/tests/server.test.ts`

**Step 1: Write the failing test**

Add tests that expect:

- MCP tool schemas no longer require `paymentToken`
- server wiring delegates payment to a Nevermined MCP integration surface instead of custom `verifyPayment`

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test -- server`
Expected: FAIL because the current server still requires `paymentToken` and custom verification.

**Step 3: Write minimal implementation**

Refactor the MCP server until the new tests pass.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test -- server`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp/tests/server.test.ts
git commit -m "test: define native nevermined mcp paywall contract"
```

### Task 2: Replace custom MCP verification with Nevermined registration

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/src/server.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/package.json`

**Step 1: Write the failing test**

Add tests for the new server entrypoints and registration helpers before implementation.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test -- server`
Expected: FAIL

**Step 3: Write minimal implementation**

- add `@nevermined-io/payments` to `apps/mcp`
- initialize `Payments`
- register the three tools at `1n` credit each
- start the MCP server through Nevermined MCP integration

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test -- server`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp/src/server.ts apps/mcp/package.json pnpm-lock.yaml
git commit -m "feat: add native nevermined paywall to mcp server"
```

### Task 3: Keep tool handlers transport-agnostic

**Files:**
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/src/tools/dump-session.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/src/tools/retrieve-context.ts`
- Modify: `/Users/bunyasit/dev/platon/apps/mcp/src/tools/get-similar-failures.ts`

**Step 1: Write the failing test**

Add or adjust tests so handlers no longer depend on `paymentToken` in tool args, but still forward the canonical payloads.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test`
Expected: FAIL

**Step 3: Write minimal implementation**

Remove argument-level payment assumptions while preserving payload validation and API forwarding.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp/src/tools/dump-session.ts apps/mcp/src/tools/retrieve-context.ts apps/mcp/src/tools/get-similar-failures.ts apps/mcp/tests/server.test.ts
git commit -m "refactor: decouple mcp tool handlers from custom payment args"
```

### Task 4: Update docs and environment guidance

**Files:**
- Modify: `/Users/bunyasit/dev/platon/README.md`
- Modify: `/Users/bunyasit/dev/platon/agent.md`
- Modify: `/Users/bunyasit/dev/platon/apps/web/docs/INTEGRATION.md`

**Step 1: Write the failing test**

Add lightweight doc assertions if needed for the old `paymentToken` argument guidance.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/mcp test`
Expected: FAIL if old MCP payment guidance remains.

**Step 3: Write minimal implementation**

Document:

- Nevermined-paid MCP usage
- sandbox defaults
- plan ordering and token acquisition
- MCP transport headers instead of tool arguments

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/mcp test`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md agent.md apps/web/docs/INTEGRATION.md
git commit -m "docs: document nevermined-paid mcp usage"
```
