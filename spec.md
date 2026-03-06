# Platon MCP Product Spec

_Last updated: 2026-03-06_

## Problem

Most agent memory products are still hard to adopt from other agent runtimes. They either expose a custom API, require platform-issued API keys, or only work well from local stdio setups. That makes third-party agent integration slower than it should be and weakens the value of MCP as a universal interface.

Platon should make remote memory access feel simple for other agents:

- connect to one MCP endpoint
- authenticate for paid usage with Nevermined x402
- discover a small stable tool surface
- read or write memory without bespoke integration glue

## Target User Segment

Primary users are developers and operators who already run AI agents in external environments such as Claude Code, Cursor, custom MCP clients, internal agent frameworks, and automation backends.

Secondary users are teams evaluating paid MCP services and deciding whether Platon is easier to adopt than building memory infrastructure themselves.

## Product Goal

Make Platon the easiest paid remote MCP memory server for third-party agents to connect to and use safely.

## Core Hypothesis

If Platon exposes a remote MCP server with stable schemas, x402-based paid access, and strict namespace isolation by `subscriberId + agentKind + agentId`, then external agent developers will integrate faster, succeed more often on the first attempt, and retain usage beyond initial testing.

## User Outcomes

Users should be able to:

- connect a remote MCP client to Platon without reading application source code
- authenticate a paid request with x402 instead of requesting a custom platform key
- send memory write requests and retrieval queries from their own agents
- trust that one agent namespace cannot leak into another

## MVP Scope

### In scope

- remote MCP endpoint over HTTP
- three stable tools:
  - `memory.dump_session`
  - `memory.retrieve_context`
  - `memory.get_similar_failures`
- Nevermined x402 payment flow for paid MCP calls
- builder registration flow for the Platon service
- subscriber-agent flow for ordering plans and obtaining access tokens
- namespace isolation by `subscriberId + agentKind + agentId`
- clear remote client setup docs and examples
- observability for connection success, auth failures, tool errors, and settlements

### Out of scope

- platform-issued customer API keys as the main auth mechanism
- large tool catalogs before the base tools are stable
- custom brokered token flows where Platon stores subscriber credentials
- prompt and resource monetization in the first public slice
- enterprise entitlement variants beyond a single clear paid path

## Primary User Journeys

### Journey 1: Third-party agent connects

1. Developer gets the MCP endpoint URL from the Platon docs.
2. Developer configures their MCP client once.
3. Their agent connects successfully and lists the available tools.

### Journey 2: Subscriber agent makes a paid call

1. Subscriber agent orders or already has the Nevermined plan.
2. Subscriber agent obtains an x402 access token.
3. Subscriber agent calls a Platon MCP tool with the paid token.
4. Platon verifies the request, executes it, and redeems credits on success.

### Journey 3: Namespace-safe memory usage

1. Agent A writes a session into namespace `subscriber-1 / coder / agent-a`.
2. Agent B in `subscriber-1 / researcher / agent-b` queries memory.
3. Agent B does not see Agent A memory unless the namespace matches exactly.

## Product Requirements

### 1. Easy remote connectivity

Platon must support a real remote MCP connection model rather than only local stdio transport.

Success criteria:

- remote clients can connect with standard MCP configuration
- tool discovery works immediately after connect
- docs include at least one working configuration example

### 2. Stable tool interface

The first public tool set must stay intentionally small and predictable.

Requirements:

- fixed tool names
- versioned input and output contracts
- clear error semantics for auth, payment, invalid input, and server failures
- backward-compatible changes by default

### 3. Paid access without platform API key sprawl

External paid usage should rely on Nevermined x402, not a second customer auth product.

Requirements:

- builder-side Nevermined registration for Platon agents and plans
- subscriber-side token acquisition flow
- `payment-signature` support on the MCP request path
- settlement only after successful execution

### 4. Namespace-safe memory

All graph reads and writes must be scoped by:

- `subscriberId`
- `agentKind`
- `agentId`

Requirements:

- namespace resolution happens before graph access
- retrieval cannot cross namespace boundaries
- worker writes preserve the same namespace rules as synchronous writes

### 5. Integration quality

The product must feel operable, not just technically functional.

Requirements:

- health endpoint
- tool-level error observability
- request and settlement tracing
- rate limiting and abuse protections
- troubleshooting docs for common auth and payment failures

## Experience Principles

- One obvious way to connect
- One obvious way to pay
- One obvious way to understand failures
- No hidden namespace behavior
- No silent contract drift

## Metrics

### Primary metric

- Successful third-party MCP integrations per week
  - Definition: unique external workspaces or agent deployments that connect, list tools, and complete at least one successful paid tool call
  - Initial target: 10 successful external integrations in the first 30 days after launch
  - Alert threshold: fewer than 3 successful integrations in a rolling 14-day window

### Secondary metrics

- Time to first successful paid tool call
  - Target: median under 20 minutes from first connect
- MCP connection success rate
  - Target: 95% or higher
- Paid tool call success rate
  - Target: 97% or higher excluding client input errors
- 7-day retained external integrations
  - Target: 40% or higher

### Counter-metrics

- Auth and payment support tickets
  - Alert threshold: more than 20% of new integrations require manual support
- Namespace isolation incidents
  - Target: zero
- Settlement failure rate
  - Alert threshold: above 1%
- P95 MCP tool latency
  - Alert threshold: above 2.5 seconds for retrieval and above 5 seconds for memory writes

## Rollout Guardrails

- Do not expand the public tool set until the first three tools are stable.
- Do not introduce platform API keys for general users unless x402 proves insufficient.
- Do not ship remote MCP publicly until namespace isolation tests pass for both API and MCP paths.
- Do not launch broadly if the first-run setup docs are not verified against at least one external MCP client.

## Decision Points

- Is remote MCP the primary product surface or only a wrapper around HTTP services
- Whether MCP requests call shared services directly or proxy through the API layer
- Whether retrieval stays graph-first only or blends graph and vector search in the first public release

## Open Questions

- Which external clients are in the official compatibility matrix for launch
- Whether MCP auth should be fully embedded in the remote transport or documented as a client-side token step
- Whether balance inspection should be visible from a dedicated MCP tool or left to Nevermined-native tooling

## What Else To Build Next

- compatibility matrix page for Claude Code, Cursor, custom SDK clients, and internal agent runtimes
- remote MCP integration runbook with copy-paste configs
- public changelog for tool contract changes
- request tracing view in the dashboard for failed MCP calls
- rate limit and abuse controls before public rollout
- sample agent repos that show end-to-end subscriber setup

## Execution Checklist

- create remote MCP endpoint page on the website
- publish this spec on the website
- align landing page messaging with x402 and MCP-first positioning
- add builder and subscriber quickstart docs
- verify namespace isolation with end-to-end tests
- test at least one remote third-party MCP client before launch
