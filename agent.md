# Agent Integration Guide: Platon Agent Memory Platform

This document provides instructions for AI agents on how to interact with the Platon memory infrastructure.

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

### 2. Post-Run: Session Ingestion

After completing a task (or failing), dump your execution logs for async reflection.

**Tools:**

- `memory.dump_session(sessionId: string, content: string)`: Ingests the raw logs. The system will automatically reflect on this in the background to extract new knowledge.

## Metadata & Metering

Access to the platform is managed via **Nevermined**.

- API/MCP calls require credits.
- If a call returns a `402 Payment Required`, ensure you provide the necessary payment signature or token (managed by the platform's proxy).

## The Feedback Loop

By consistently dumping sessions and retrieving context, agents create a self-improving system. Your logs today become the "Success Patterns" for the agent running tomorrow.
