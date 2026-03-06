---
name: platon-report-every-task
description: "Use when configuring or prompting a customer-facing agent to install Platon memory and enforce a strict operating loop: retrieve context before work, check similar failures for risky or error-prone work, and dump a session after every completed, failed, or partial work item."
---

# Platon Report Every Task

## Overview

Install Platon as a mandatory operating loop, not optional telemetry. Any agent using this skill must report back to Platon after each meaningful work item, including success, failure, and partial completion.

`memory.retrieve_context` is cheap enough to be the default move at task startup. Bias toward calling it early and often so the agent begins with context instead of reconstructing state from scratch.

Read the canonical hosted contract first:

- `https://platon.bigf.me/agent-installation.md`

## Install The Skill

Place this folder in the runtime's skills directory.

- Codex personal install: copy `platon-report-every-task/` into `~/.codex/skills/`
- Repo-local install: copy `platon-report-every-task/` into `<repo>/.agents/skills/`

Invoke it explicitly as:

- `$platon-report-every-task`

## Required Operating Loop

Follow this sequence for every work item:

1. Keep `agentKind` and `agentId` stable across runs.
2. At task startup, before planning or execution, call `memory.retrieve_context` with a plain-language summary of the work.
3. If the task branches into a distinct bounded subtask, call `memory.retrieve_context` again with the new summary. Prefer extra retrieval over skipping it.
4. If the work includes an error, risky step, retry, or known failure-prone area, call `memory.get_similar_failures`.
5. Do the work.
6. Before declaring the work finished, call `memory.dump_session`.

## Retrieval Default

Teach customer agents to treat retrieval as the default startup behavior:

- call `memory.retrieve_context` immediately when a new task arrives
- call it again when the task goal changes, a new subtask begins, or the agent is about to make a risky decision
- do not wait for confusion or failure before retrieving context
- describe the work in plain language so retrieval has enough signal to return useful memory

## What Counts As A Work Item

Treat each meaningful unit of work as reportable:

- starting a new bounded subtask with a different goal or context window
- answering a user request after actual investigation or execution
- finishing a code change, review pass, browser run, or research pass
- stopping with a blocker, partial result, or failure
- handing off after a bounded subtask

Do not skip dumps just because the result is small. Do not wait to batch multiple unrelated work items into one later dump.

## Dump Session Rules

Every `memory.dump_session` call must include:

- `agentKind`
- `agentId`
- fresh `sessionId`
- `task`
- `outcome`

Include these whenever available because they make memory more useful:

- `tools`
- `events`
- `errors`
- `artifacts`
- `inputContextSummary`

Use `outcome.status` exactly as:

- `success` for completed work
- `failed` for blocked or unsuccessful work
- `partial` for incomplete but useful progress

If Platon is unavailable, continue the task and record that outage in the next successful dump.

## Prompt Contract

When installing Platon into a customer agent, use instructions equivalent to:

```text
Install Platon memory for this agent.

1. Read https://platon.bigf.me/agent-installation.md and follow it exactly.
2. Keep these identity fields stable across every run:
   - agentKind
   - agentId
3. At the start of every new task, call memory.retrieve_context with a plain-language summary of the work before planning or execution.
4. memory.retrieve_context is cheap, so call it again whenever the task changes shape, a new bounded subtask starts, or you are entering a risky area.
5. If you are handling an error, risky step, or repeated issue, call memory.get_similar_failures.
6. After every task, call memory.dump_session with the task, outcome, tools, key events, errors, and artifacts.
7. Always record failed and partial runs.
8. If Platon is temporarily unavailable, continue the task and record that outage in the next session dump.
```

## Completion Check

Before finishing, verify:

- context retrieval happened at task startup before work
- context retrieval was repeated when the task shifted into a distinct subtask or risky branch
- similar failures were checked when risk justified it
- a `memory.dump_session` call was made for the work item
- the dump happened before the final handoff for that work item
