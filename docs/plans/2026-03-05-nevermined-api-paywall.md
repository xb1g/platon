# Nevermined API Paywall Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mock API paywall with a real Nevermined x402 integration for `POST /sessions` and `POST /retrieve`, backed by env-configured sandbox credentials and the provided agent/plan IDs.

**Architecture:** Keep Fastify as the API server and implement the paywall with the generic Nevermined x402 verify/settle flow inside a Fastify plugin, because the SDK documents Express middleware but not Fastify middleware. The plugin will protect only the configured routes, skip `/health`, attach settlement metadata to successful responses, and read Nevermined config from environment variables.

**Tech Stack:** TypeScript, Fastify, Vitest, `@nevermined-io/payments`

---

### Task 1: Lock the paywall behavior with tests

**Files:**
- Modify: `apps/api/tests/paywall.test.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/plugins/paywall.ts`

**Step 1: Write the failing test**

```ts
it('leaves health public', async () => {
  const app = await buildServer({ paymentsClient: fakePayments })
  const response = await app.inject({ method: 'GET', url: '/health' })
  expect(response.statusCode).toBe(200)
})

it('returns 402 with payment-required when a protected route has no token', async () => {
  const app = await buildServer({ paymentsClient: fakePayments })
  const response = await app.inject({
    method: 'POST',
    url: '/sessions',
    payload: validSessionPayload
  })
  expect(response.statusCode).toBe(402)
  expect(response.headers['payment-required']).toBeDefined()
})

it('verifies and settles a paid protected request', async () => {
  const app = await buildServer({ paymentsClient: fakePayments })
  const response = await app.inject({
    method: 'POST',
    url: '/retrieve',
    headers: { 'payment-signature': 'token-123' },
    payload: { query: 'redis outage' }
  })
  expect(response.statusCode).toBe(200)
  expect(response.headers['payment-response']).toBeDefined()
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: FAIL because the current plugin does not protect specific routes, does not emit x402 headers, and is not wired into the server.

**Step 3: Write minimal implementation**

```ts
server.addHook('preHandler', async (request, reply) => {
  if (!isProtectedRoute(request)) return
  const token = request.headers['payment-signature']
  const paymentRequired = buildPaymentRequired(planId, {
    endpoint: request.routeOptions.url,
    httpVerb: request.method,
    agentId
  })
  if (!token) return send402(reply, paymentRequired)
  const verification = await payments.facilitator.verifyPermissions(...)
  if (!verification.isValid) return send402(reply, paymentRequired, verification.invalidReason)
  request.paymentContext = { paymentRequired, token, credits }
})
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "feat: add nevermined api paywall"
```

### Task 2: Add config and dependency support

**Files:**
- Modify: `apps/api/package.json`
- Modify: `.env.example`
- Create: `.env`

**Step 1: Write the failing test**

Extend the paywall test to construct the plugin from env-backed defaults and fail when required Nevermined variables are missing.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: FAIL because the env-backed loader does not exist yet.

**Step 3: Write minimal implementation**

```ts
const nvmConfig = {
  apiKey: process.env.NVM_API_KEY!,
  environment: process.env.NVM_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
  planId: process.env.NVM_PLAN_ID!,
  agentId: process.env.NVM_AGENT_ID!
}
```

Add `@nevermined-io/payments` to `apps/api/package.json`, keep `.env.example` on placeholders, and write the user-provided sandbox values into `.env`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/package.json .env.example .env
git commit -m "chore: configure nevermined api env"
```

### Task 3: Verify integration quality

**Files:**
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/plugins/paywall.ts`

**Step 1: Write the failing test**

Keep the same regression tests and ensure the real app builder registers the plugin before routes.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @memory/api test -- paywall`
Expected: FAIL if the plugin is not registered correctly in the real server.

**Step 3: Write minimal implementation**

Export a reusable `buildServer()` function for tests and production startup, register the paywall plugin in the real app, and only call `listen()` from the executable entrypoint.

**Step 4: Run test to verify it passes**

Run:
- `pnpm --filter @memory/api test -- paywall`
- `pnpm --filter @memory/api typecheck`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api
git commit -m "refactor: build api server with nevermined paywall"
```
