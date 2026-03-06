"use client";

import {
  AGENT_INSTALLATION_URL,
  API_BASE_URL,
  EMBEDDED_AGENT_ID,
  EMBEDDED_PLAN_ID,
  MCP_ENDPOINT_URL,
  PLATON_REPORT_EVERY_TASK_SKILL_NAME,
  PLATON_REPORT_EVERY_TASK_SKILL_REPO_PATH,
  PLATON_REPORT_EVERY_TASK_SKILL_URL,
} from "@/lib/agent-installation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Copy } from "lucide-react";
import { useState } from "react";

const DIRECT_API_HEADER = "payment-signature: <x402-access-token>";
const RETRIEVE_API_URL = `${API_BASE_URL}/retrieve`;
const SESSIONS_API_URL = `${API_BASE_URL}/sessions`;

const hostedUsageSnippet = `const subscriberPayments = Payments.getInstance({
  nvmApiKey: process.env.NVM_SUBSCRIBER_API_KEY!,
  environment: process.env.NVM_ENVIRONMENT || "sandbox"
})

const { accessToken } = await subscriberPayments.x402.getX402AccessToken(
  "${EMBEDDED_PLAN_ID}",
  "${EMBEDDED_AGENT_ID}"
)

{
  "mcpServers": {
    "platon": {
      "url": "${MCP_ENDPOINT_URL}",
      "headers": { "Authorization": "Bearer \${accessToken}" }
    }
  }
}`;

const firstMcpSessionSnippet = `POST ${MCP_ENDPOINT_URL}
Accept: application/json, text/event-stream
Authorization: Bearer <x402-access-token>

After initialize succeeds:
Mcp-Session-Id: <session-id-from-initialize>`;

const skillInstallSnippet = `git clone https://github.com/xb1g/platon.git
mkdir -p ~/.codex/skills
cp -R platon/${PLATON_REPORT_EVERY_TASK_SKILL_REPO_PATH} ~/.codex/skills/

# Then tell your agent to use:
$${PLATON_REPORT_EVERY_TASK_SKILL_NAME}`;

const plainTextContent = `# Platon Agent Skill

## Installation

Read the canonical hosted install contract first:

${AGENT_INSTALLATION_URL}

Install the reusable skill if you want the agent to enforce the loop automatically:

- Skill: ${PLATON_REPORT_EVERY_TASK_SKILL_NAME}
- Source: ${PLATON_REPORT_EVERY_TASK_SKILL_URL}

Example Codex install:

${skillInstallSnippet}

For the hosted MCP service, generate an x402 token and attach it at the transport layer.
Use the hosted Nevermined identifiers exactly as shown here:

${hostedUsageSnippet}

For the first remote MCP session, the transport must also send:
- Accept: application/json, text/event-stream
- Mcp-Session-Id: <session-id-from-initialize> on requests after initialize

If your runtime does not support remote MCP, call the HTTP API directly:
- POST ${RETRIEVE_API_URL}
- POST ${SESSIONS_API_URL}
- ${DIRECT_API_HEADER}

## Overview

Platon is an agent memory system accessible via MCP (Model Context Protocol). It provides three tools that give your AI agents persistent memory across sessions.

The core loop:
1. BEFORE each task — retrieve relevant context at task startup, and retrieve again when the task branches into a new bounded subtask
2. EXECUTE the task informed by retrieved memory
3. AFTER each task — dump the session for reflection and storage

This creates a continuous learning cycle where agents improve with every interaction.

## Tool: memory.retrieve_context

Description: Retrieve relevant context for a task.

Parameters:
- agentKind (string, required) — The kind/type of agent (e.g. "code-reviewer")
- agentId (string, required) — The agent identifier (e.g. "reviewer-prod-01")
- query (string, required) — Natural-language query describing the task
- limit (number, optional, default 5) — Max results to return (max 20)
- filters (object, optional) — Additional filters for retrieval

Returns: Numbered results with [confidence] title: summary
Each result includes a confidence score from 0 to 1.

When to call: At task startup before planning or execution. Retrieval is cheap, so call again when the task changes shape or a bounded subtask begins.

Example:
memory.retrieve_context({
  agentKind: "code-reviewer",
  agentId: "reviewer-prod-01",
  query: "reviewing authentication middleware changes",
  limit: 5
})

## Tool: memory.get_similar_failures

Description: Find similar past failures to avoid repeating mistakes.

Parameters:
- agentKind (string, required) — The kind/type of agent
- agentId (string, required) — The agent identifier
- error (string, required) — Error message or description to match against
- limit (number, optional, default 5) — Max results to return
- filters (object, optional) — Additional filters

Returns: Numbered failure results with [confidence] title: summary
Includes resolution summaries from past failures.

When to call: Before tasks in areas where errors have occurred, or when you encounter an error and want to check if it's been seen before.

Example:
memory.get_similar_failures({
  agentKind: "code-reviewer",
  agentId: "reviewer-prod-01",
  error: "TypeError: Cannot read property 'headers' of undefined"
})

## Tool: memory.dump_session

Description: Dump a session for reflection and storage.

Parameters:
- agentKind (string, required) — The kind/type of agent
- agentId (string, required) — The agent identifier
- sessionId (string, required) — Unique session identifier
- task (object, required) — { kind: string, summary: string }
- outcome (object, required) — { status: "success" | "failed" | "partial", summary: string }
- inputContextSummary (string, optional) — Summary of input context
- tools (array, optional) — [{ name: string, category: string }]
- events (array, optional) — [{ type: string, summary: string }]
- errors (array, optional) — [{ message: string, code?: string, retryable?: boolean }]
- artifacts (array, optional) — [{ kind: string, uri: string, summary?: string }]
- humanFeedback (object, optional) — { rating: 1-5, summary: string }

When to call: After every task, including failures. Failures are the most valuable learnings.

Example:
memory.dump_session({
  agentKind: "code-reviewer",
  agentId: "reviewer-prod-01",
  sessionId: "sess-20260306-001",
  task: { kind: "code-review", summary: "Review auth middleware PR #42" },
  outcome: { status: "success", summary: "Found 3 issues, all addressed by author" },
  tools: [{ name: "grep", category: "search" }],
  events: [{ type: "review-comment", summary: "Flagged missing rate limit" }],
  artifacts: [{ kind: "review", uri: "https://github.com/org/repo/pull/42#review" }]
})

## Workflow Summary

Before every task:
[ ] Call memory.retrieve_context immediately at task startup with a descriptive query
[ ] Call memory.retrieve_context again if the goal changes or a bounded subtask starts
[ ] If error-prone area, call memory.get_similar_failures
[ ] Apply high-confidence results (>0.7) to inform approach

After every task:
[ ] Call memory.dump_session with task, outcome, and details
[ ] Include tools, events, errors, and artifacts for richer learnings
[ ] Always dump even for failed tasks

## API Endpoints

These HTTP endpoints are equivalent alternatives to the MCP tools:

POST https://platon.bigf.me/api/sessions — Session ingestion (equivalent to memory.dump_session)
POST https://platon.bigf.me/api/retrieve — Context retrieval (equivalent to memory.retrieve_context)

Note: MCP is the primary interface. Use HTTP endpoints when MCP is not available.

## Best Practices

- Always dump sessions even for failures — they produce the most valuable learnings
- Retrieve at task startup by default because retrieve_context is cheap
- Use descriptive, natural-language queries in retrieve_context
- Retrieve again when the task branches into a distinct bounded subtask
- Check get_similar_failures before retrying known error-prone areas
- High-confidence results (>0.7) should strongly inform your approach
- Include tools/events/errors in dump_session for richer pattern extraction
- Use consistent agentKind and agentId values across sessions for continuity`;

function CopyAllButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(plainTextContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/65 hover:text-white hover:border-white/30 transition-all"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-accent-emerald" />
          <span className="text-accent-emerald">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copy All
        </>
      )}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-default/70 bg-bg-secondary/70 p-6 md:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-6 border-b border-border-default/60 pb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div
      className="rounded-xl overflow-hidden my-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-white/80">
        {children}
      </pre>
    </div>
  );
}

function ParamRow({
  name,
  type,
  required,
  description,
}: {
  name: string;
  type: string;
  required: boolean;
  description: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-3 border-b border-border-default/40 last:border-0">
      <div className="flex items-center gap-2 sm:w-56 shrink-0">
        <code className="text-accent-emerald text-sm">{name}</code>
        <span className="text-xs text-text-muted">({type})</span>
        {required && (
          <span className="text-[10px] uppercase tracking-wider text-accent-violet font-semibold">
            required
          </span>
        )}
      </div>
      <span className="text-sm text-text-secondary">{description}</span>
    </div>
  );
}

export default function AgentSkillPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Hero header */}
      <div
        className="border-b border-border-default/70"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(139,92,246,0.18), transparent 40%), radial-gradient(circle at top right, rgba(14,165,233,0.10), transparent 30%)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="mt-8 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-accent-violet" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
                Agent Skill
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-light tracking-tight">
                Platon Agent Skill
              </h1>
              <p className="mt-4 max-w-2xl text-base md:text-lg text-text-secondary leading-relaxed">
                Install a reusable skill that makes customer agents retrieve context before work and report every completed, failed, or partial work item back to Platon.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <CopyAllButton />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14 space-y-8">
        {/* Installation */}
        <Section title="Installation">
          <p className="text-text-secondary leading-relaxed mb-4">
            Use the canonical hosted contract first:
            {" "}
            <a
              href={AGENT_INSTALLATION_URL}
              className="text-accent-emerald hover:text-accent-sky transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              {AGENT_INSTALLATION_URL}
            </a>
            . This page is a quick reference, not the source of truth for first-run transport setup.
          </p>
          <p className="text-text-secondary leading-relaxed mb-4">
            If you want an installable rule set instead of a one-off prompt, use the
            {" "}
            <code className="text-accent-emerald text-sm">{PLATON_REPORT_EVERY_TASK_SKILL_NAME}</code>
            {" "}
            skill from
            {" "}
            <a
              href={PLATON_REPORT_EVERY_TASK_SKILL_URL}
              className="text-accent-emerald hover:text-accent-sky transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              {PLATON_REPORT_EVERY_TASK_SKILL_REPO_PATH}
            </a>
            .
          </p>
          <p className="text-text-secondary leading-relaxed mb-4">
            For Codex, install it by copying that folder into
            {" "}
            <code className="text-accent-emerald text-sm">~/.codex/skills/</code>
            . If you want project-scoped behavior instead, copy it into your repo&apos;s
            {" "}
            <code className="text-accent-emerald text-sm">.agents/skills/</code>
            {" "}
            directory.
          </p>
          <CodeBlock>{skillInstallSnippet}</CodeBlock>
          <p className="text-text-secondary leading-relaxed mb-4">
            For hosted usage, generate an x402 token with a Nevermined subscriber key using the embedded plan and agent IDs, then attach it at the MCP transport layer:
          </p>
          <CodeBlock>{hostedUsageSnippet}</CodeBlock>
          <p className="text-text-secondary leading-relaxed mb-4">
            The first remote MCP session also needs the StreamableHTTP transport contract. Without these headers, initialization can fail before the agent ever reaches a tool call.
          </p>
          <CodeBlock>{firstMcpSessionSnippet}</CodeBlock>
          <p className="text-text-secondary leading-relaxed">
            If your runtime does not support remote MCP, use the direct HTTP API instead and send
            {" "}
            <code className="text-accent-emerald text-sm">{DIRECT_API_HEADER}</code>
            {" "}
            to
            {" "}
            <code className="text-accent-emerald text-sm">{RETRIEVE_API_URL}</code>
            {" "}
            and
            {" "}
            <code className="text-accent-emerald text-sm">{SESSIONS_API_URL}</code>.
          </p>
        </Section>

        {/* Overview */}
        <Section title="Overview">
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              Platon is an agent memory system accessible via MCP (Model Context
              Protocol). The installable skill packages the operating loop so a
              customer agent keeps using it instead of forgetting to report back.
            </p>
            <p>The core loop:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong className="text-text-primary">BEFORE</strong> each task
                — retrieve relevant context at task startup, and retrieve again
                when the task branches into a new bounded subtask
              </li>
              <li>
                <strong className="text-text-primary">EXECUTE</strong> the task
                informed by retrieved memory
              </li>
              <li>
                <strong className="text-text-primary">AFTER</strong> each task —
                dump the session for reflection and storage
              </li>
            </ol>
            <p>
              This creates a continuous learning cycle where agents improve with
              every interaction.
            </p>
          </div>
        </Section>

        {/* Tool: memory.retrieve_context */}
        <Section title="Tool: memory.retrieve_context">
          <p className="text-text-secondary leading-relaxed mb-4">
            Retrieve relevant context for a task. Call this at task startup to
            inform your approach with past learnings, and call it again when
            the task changes shape.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Parameters
          </h3>
          <div className="rounded-xl border border-border-default/50 p-4">
            <ParamRow name="agentKind" type="string" required description='The kind/type of agent (e.g. "code-reviewer")' />
            <ParamRow name="agentId" type="string" required description='The agent identifier (e.g. "reviewer-prod-01")' />
            <ParamRow name="query" type="string" required description="Natural-language query describing the task" />
            <ParamRow name="limit" type="number" required={false} description="Max results to return (default 5, max 20)" />
            <ParamRow name="filters" type="object" required={false} description="Additional filters for retrieval" />
          </div>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Returns
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            Numbered results with{" "}
            <code className="text-accent-sky">[confidence] title: summary</code>.
            Each result includes a confidence score from 0 to 1.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            When to call
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            At task startup before planning or execution. Retrieval is cheap, so
            call again when the goal changes or a bounded subtask begins.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Example
          </h3>
          <CodeBlock>
            {`memory.retrieve_context({
  agentKind: "code-reviewer",
  agentId: "reviewer-prod-01",
  query: "reviewing authentication middleware changes",
  limit: 5
})`}
          </CodeBlock>
        </Section>

        {/* Tool: memory.get_similar_failures */}
        <Section title="Tool: memory.get_similar_failures">
          <p className="text-text-secondary leading-relaxed mb-4">
            Find similar past failures to avoid repeating mistakes.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Parameters
          </h3>
          <div className="rounded-xl border border-border-default/50 p-4">
            <ParamRow name="agentKind" type="string" required description="The kind/type of agent" />
            <ParamRow name="agentId" type="string" required description="The agent identifier" />
            <ParamRow name="error" type="string" required description="Error message or description to match against" />
            <ParamRow name="limit" type="number" required={false} description="Max results to return (default 5)" />
            <ParamRow name="filters" type="object" required={false} description="Additional filters" />
          </div>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Returns
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            Numbered failure results with{" "}
            <code className="text-accent-sky">[confidence] title: summary</code>.
            Includes resolution summaries from past failures.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            When to call
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            Before tasks in areas where errors have occurred, or when you
            encounter an error and want to check if it has been seen before.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Example
          </h3>
          <CodeBlock>
            {`memory.get_similar_failures({
  agentKind: "code-reviewer",
  agentId: "reviewer-prod-01",
  error: "TypeError: Cannot read property 'headers' of undefined"
})`}
          </CodeBlock>
        </Section>

        {/* Tool: memory.dump_session */}
        <Section title="Tool: memory.dump_session">
          <p className="text-text-secondary leading-relaxed mb-4">
            Dump a session for reflection and storage. Call this after every task,
            including failures.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Parameters
          </h3>
          <div className="rounded-xl border border-border-default/50 p-4">
            <ParamRow name="agentKind" type="string" required description="The kind/type of agent" />
            <ParamRow name="agentId" type="string" required description="The agent identifier" />
            <ParamRow name="sessionId" type="string" required description="Unique session identifier" />
            <ParamRow name="task" type="object" required description='{ kind: string, summary: string } — Task descriptor' />
            <ParamRow name="outcome" type="object" required description='{ status: "success" | "failed" | "partial", summary: string } — Outcome descriptor' />
            <ParamRow name="inputContextSummary" type="string" required={false} description="Summary of input context used" />
            <ParamRow name="tools" type="array" required={false} description="[{ name: string, category: string }] — Tools used during the session" />
            <ParamRow name="events" type="array" required={false} description="[{ type: string, summary: string }] — Notable events during the session" />
            <ParamRow name="errors" type="array" required={false} description="[{ message: string, code?: string, retryable?: boolean }] — Errors encountered" />
            <ParamRow name="artifacts" type="array" required={false} description="[{ kind: string, uri: string, summary?: string }] — Files or outputs created" />
            <ParamRow name="humanFeedback" type="object" required={false} description="{ rating: 1-5, summary: string } — Optional human feedback" />
          </div>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            When to call
          </h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            After every task, including failures. Failures are the most valuable
            learnings.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">
            Example
          </h3>
          <CodeBlock>
            {`memory.dump_session({
  agentKind: "code-reviewer",
  agentId: "reviewer-prod-01",
  sessionId: "sess-20260306-001",
  task: { kind: "code-review", summary: "Review auth middleware PR #42" },
  outcome: { status: "success", summary: "Found 3 issues, all addressed" },
  tools: [{ name: "grep", category: "search" }],
  events: [{ type: "review-comment", summary: "Flagged missing rate limit" }],
  artifacts: [{ kind: "review", uri: "https://github.com/org/repo/pull/42#review" }]
})`}
          </CodeBlock>
        </Section>

        {/* Workflow Summary */}
        <Section title="Workflow Summary">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                Before every task
              </h3>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet mt-0.5">&#9744;</span>
                  Call <code className="text-accent-emerald">memory.retrieve_context</code> immediately at task startup with a descriptive query
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet mt-0.5">&#9744;</span>
                  Call <code className="text-accent-emerald">memory.retrieve_context</code> again if the goal changes or a bounded subtask starts
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet mt-0.5">&#9744;</span>
                  If error-prone area, call <code className="text-accent-emerald">memory.get_similar_failures</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet mt-0.5">&#9744;</span>
                  Apply high-confidence results (&gt;0.7) to inform approach
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                After every task
              </h3>
              <ul className="space-y-2 text-text-secondary text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet mt-0.5">&#9744;</span>
                  Call <code className="text-accent-emerald">memory.dump_session</code> with task, outcome, and details
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet mt-0.5">&#9744;</span>
                  Include tools, events, errors, and artifacts for richer learnings
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-violet mt-0.5">&#9744;</span>
                  Always dump even for failed tasks
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* API Endpoints */}
        <Section title="API Endpoints">
          <p className="text-text-secondary leading-relaxed mb-4">
            These HTTP endpoints are equivalent alternatives to the MCP tools. Send
            {" "}
            <code className="text-accent-emerald text-sm">{DIRECT_API_HEADER}</code>
            {" "}
            on each request:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border-default/50 p-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
              <code className="text-accent-emerald text-sm font-semibold whitespace-nowrap">
                POST {SESSIONS_API_URL}
              </code>
              <span className="text-text-muted text-sm">
                Session ingestion (equivalent to memory.dump_session)
              </span>
            </div>
            <div className="rounded-xl border border-border-default/50 p-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
              <code className="text-accent-emerald text-sm font-semibold whitespace-nowrap">
                POST {RETRIEVE_API_URL}
              </code>
              <span className="text-text-muted text-sm">
                Context retrieval (equivalent to memory.retrieve_context)
              </span>
            </div>
          </div>
          <p className="text-text-muted text-sm mt-4">
            Note: MCP is the primary interface. Use HTTP endpoints when MCP is
            not available.
          </p>
        </Section>

        {/* Best Practices */}
        <Section title="Best Practices">
          <ul className="space-y-3 text-text-secondary leading-relaxed">
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              Always dump sessions even for failures — they produce the most
              valuable learnings
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              Retrieve at task startup by default because retrieve_context is
              cheap
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              Use descriptive, natural-language queries in retrieve_context
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              Retrieve again when the task branches into a distinct bounded
              subtask
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              Check get_similar_failures before retrying known error-prone areas
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              High-confidence results (&gt;0.7) should strongly inform your
              approach
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              Include tools/events/errors in dump_session for richer pattern
              extraction
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-violet mt-1 shrink-0">&#8226;</span>
              Use consistent agentKind and agentId values across sessions for
              continuity
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
