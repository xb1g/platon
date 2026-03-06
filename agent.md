# Agent Integration Guide: Platon Agent Memory Platform

This document provides instructions for AI agents on how to interact with the Platon memory infrastructure.

## Canonical Bootstrap

Before integrating directly from repository docs, read the hosted install contract at `https://platon.bigf.me/agent-installation.md`.

That hosted document is the canonical runtime-neutral source for:

- the operator prompt to paste into an autonomous system
- the stable identity contract for `agentKind` and `agentId`
- the required retrieve-before / dump-after operating loop
- the remote MCP and direct HTTP installation paths
- the x402 header rules for paid usage

## System Overview

Platon is a memory layer that converts raw session logs into a structured "experience graph." It allows agents to learn from past runs, avoiding repeated failures and reusing successful tactics.

## How to Use Platon

Agents should interact with Platon at two key points in their lifecycle:

### 1. Pre-Run: Context Retrieval

Before starting a task, retrieve relevant tactical lessons or similar past failures to inform your plan.

**Tools:**

- `memory.retrieve_context(query: string)`: Returns ranked learning entries and success patterns.
- `memory.get_similar_failures(error: string)`: Searches specifically for past errors and their known fixes.

**Example Thinking Pattern:**

> "My task is to deploy to AWS. I should check Platon to see if there are any known deployment failures or optimized IAM policies used in previous sessions."

## Production Environment

The Agent Memory Platform is deployed at:

- **Web Dashboard**: [https://platon.bigf.me](https://platon.bigf.me)
- **Hosted Install Contract**: [https://platon.bigf.me/agent-installation.md](https://platon.bigf.me/agent-installation.md)
- **API Base URL**: [https://platon.bigf.me/api](https://platon.bigf.me/api)

### Accessing the API

When integrating your agents, use the production API URL for direct HTTP calls and the MCP `/mcp` endpoint for remote MCP access.

Keep `agentKind` and `agentId` stable across runs. If you rotate either field casually, Platon will treat the caller as a new memory namespace.

## Development Setup

### 2. Post-Run: Session Ingestion

After completing a task (or failing), dump your execution logs for async reflection.

**Tools:**

- `memory.dump_session(payload)`: Ingests a structured session payload. The system will automatically reflect on it in the background to extract new knowledge.

**Payload fields:** `sessionId`, `agentId`, `agentKind`, `task`, `outcome`, `tools`, `events`, `artifacts`, `errors`. Optional: `humanFeedback`, `inputContextSummary`.

**HTTP and MCP are co-equal interfaces** — use the REST API or the paid HTTP MCP server with the same structured payload. Claude Hooks are an optional adapter; see `apps/mcp/examples/claude-hooks/README.md` for setup. The core architecture is provider-neutral.

## Metadata & Metering

Access to the platform is managed via **Nevermined**.

- API/MCP calls require credits.
- Direct HTTP API calls use the `payment-signature` header with an x402 access token.
- Paid HTTP MCP calls use `Authorization: Bearer <x402-token>` on the MCP transport, not a `paymentToken` tool argument.

Acquire the paid token through `payments.x402.getX402AccessToken(...)`. Do not use the older `payments.agents.getAgentAccessToken(...)` helper for the hosted Platon flow.

## The Feedback Loop

By consistently dumping sessions and retrieving context, agents create a self-improving system. Your logs today become the "Success Patterns" for the agent running tomorrow.