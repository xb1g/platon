"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Copy,
  Check,
  Play,
  Sparkles,
  Search,
  Zap,
  AlertTriangle,
  Database,
  Brain,
  Rocket,
  Bug,
  HelpCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

/* ─── Reusable code panel with tabs ─── */
function CodePanel({
  tabs,
  contents,
  rawContents,
}: {
  tabs: string[];
  contents: React.ReactNode[];
  rawContents: string[];
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(rawContents[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-0.5 ml-2">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                  activeTab === i
                    ? "bg-white/8 text-white/90"
                    : "text-white/35 hover:text-white/55"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-accent-emerald" />
              <span className="text-[10px] text-accent-emerald">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-5 overflow-x-auto">
        <pre className="text-[13px] leading-relaxed font-mono">
          {contents[activeTab]}
        </pre>
      </div>
    </div>
  );
}

/* ─── Architecture card ─── */
function ArchCard({
  icon: Icon,
  title,
  description,
  accentClass,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accentClass: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-2xl p-8 flex flex-col items-center text-center flex-1 min-w-[240px]"
    >
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${accentClass}`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </motion.div>
  );
}

/* ─── Animated arrow between arch cards ─── */
function AnimatedArrow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center justify-center shrink-0"
    >
      {/* Horizontal on desktop */}
      <ArrowRight className="w-6 h-6 text-accent-violet/50 hidden md:block" />
      {/* Vertical on mobile */}
      <ArrowRight className="w-6 h-6 text-accent-violet/50 md:hidden rotate-90" />
    </motion.div>
  );
}

/* ─── Timeline step ─── */
function TimelineStep({
  step,
  title,
  description,
  icon: Icon,
  accentClass,
  index,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
  accentClass: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex gap-5 group"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${accentClass}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {step < 7 && (
          <div className="w-px flex-1 bg-border-default/50 min-h-[24px]" />
        )}
      </div>
      {/* Content */}
      <div className="pb-8">
        <span className="text-xs text-text-muted font-mono mb-1 block">
          Step {step}
        </span>
        <h4 className="text-base font-semibold text-text-primary mb-1 group-hover:text-accent-violet transition-colors">
          {title}
        </h4>
        <p className="text-sm text-text-muted leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

/* ─── Raw code strings for copy ─── */
const dumpSessionMcp = `{
  "method": "tools/call",
  "params": {
    "name": "memory.dump_session",
    "arguments": {
      "agentKind": "code-reviewer",
      "agentId": "reviewer-prod-01",
      "sessionId": "sess-20260305-a7x",
      "task": {
        "kind": "review",
        "summary": "Review PR #142 — auth middleware refactor"
      },
      "outcome": {
        "status": "success",
        "summary": "Approved with 2 suggestions"
      }
    }
  }
}`;

const dumpSessionCurl = `curl -X POST https://api.platon.dev/sessions \\
  -H "payment-signature: $X402_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentKind": "code-reviewer",
    "agentId": "reviewer-prod-01",
    "sessionId": "sess-20260305-a7x",
    "task": {
      "kind": "review",
      "summary": "Review PR #142 — auth middleware refactor"
    },
    "outcome": {
      "status": "success",
      "summary": "Approved with 2 suggestions"
    },
    "tools": [
      { "name": "read_file", "category": "filesystem" },
      { "name": "grep", "category": "search" }
    ],
    "errors": []
  }'`;

const retrieveContextMcp = `{
  "method": "tools/call",
  "params": {
    "name": "memory.retrieve_context",
    "arguments": {
      "agentKind": "code-reviewer",
      "agentId": "reviewer-prod-01",
      "query": "auth middleware best practices",
      "limit": 5
    }
  }
}`;

const retrieveContextResponse = `{
  "results": [
    {
      "id": "lrn-0042",
      "type": "learning",
      "title": "Always validate JWT expiry before claims",
      "summary": "In session sess-0039, skipping expiry check led to accepting stale tokens...",
      "confidence": 0.92
    },
    {
      "id": "lrn-0038",
      "type": "success_pattern",
      "title": "Wrap middleware in error boundary",
      "summary": "Unhandled throw in middleware crashed the process. Adding try/catch with...",
      "confidence": 0.87
    }
  ]
}`;

const getSimilarFailuresMcp = `{
  "method": "tools/call",
  "params": {
    "name": "memory.get_similar_failures",
    "arguments": {
      "agentKind": "code-reviewer",
      "agentId": "reviewer-prod-01",
      "error": "TypeError: Cannot read properties of undefined (reading 'sub')"
    }
  }
}`;

const getSimilarFailuresResponse = `{
  "results": [
    {
      "id": "fail-0019",
      "type": "failure",
      "title": "JWT payload missing 'sub' claim",
      "summary": "Token from OAuth provider X omits 'sub' when scope is limited. Resolution: fall back to 'email' claim as identifier.",
      "confidence": 0.94
    }
  ]
}`;

const claudeDesktopConfig = `{
  "mcpServers": {
    "platon": {
      "url": "https://platon.bigf.me/mcp",
      "headers": {
        "Authorization": "Bearer \${X402_ACCESS_TOKEN}"
      }
    }
  }
}`;

const cursorConfig = `{
  "mcpServers": {
    "platon": {
      "url": "https://platon.bigf.me/mcp",
      "headers": {
        "Authorization": "Bearer \${X402_ACCESS_TOKEN}"
      }
    }
  }
}`;

const customAgentTs = `import { Payments } from "@nevermined-io/payments";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const subscriberPayments = Payments.getInstance({
  nvmApiKey: process.env.NVM_SUBSCRIBER_API_KEY!,
  environment: (process.env.NVM_ENVIRONMENT ?? "sandbox") as "sandbox" | "live",
});

const { accessToken: X402_ACCESS_TOKEN } = await subscriberPayments.x402.getX402AccessToken(
  process.env.NVM_PLAN_ID!,
  process.env.NVM_AGENT_ID!,
);

const transport = new StreamableHTTPClientTransport(
  new URL("https://platon.bigf.me/mcp"),
  {
    requestInit: {
      headers: { Authorization: \`Bearer \${X402_ACCESS_TOKEN}\` },
    },
  },
);

const client = new Client({ name: "my-agent", version: "1.0.0" });
await client.connect(transport);

// Retrieve context before a task
const context = await client.callTool({
  name: "memory.retrieve_context",
  arguments: {
    agentKind: "my-agent-type",
    agentId: "agent-01",
    query: "current task description",
  },
});

// ... execute task with context ...

// Dump session after task
await client.callTool({
  name: "memory.dump_session",
  arguments: {
    agentKind: "my-agent-type",
    agentId: "agent-01",
    sessionId: "sess-001",
    task: { kind: "task-type", summary: "What the agent did" },
    outcome: { status: "success", summary: "Result summary" },
  },
});`;

/* ─── Syntax-highlighted code blocks ─── */
function DumpSessionMcpHighlighted() {
  return (
    <code>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;method&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;tools/call&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;params&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-sky">&quot;name&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-violet">&quot;memory.dump_session&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-sky">&quot;arguments&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;agentKind&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;code-reviewer&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;agentId&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;reviewer-prod-01&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;sessionId&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;sess-20260305-a7x&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;task&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"        "}</span>
      <span className="text-accent-sky">&quot;kind&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;review&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"        "}</span>
      <span className="text-accent-sky">&quot;summary&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;Review PR #142 — auth middleware refactor&quot;</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-white/40">{"}"}</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;outcome&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"        "}</span>
      <span className="text-accent-sky">&quot;status&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;success&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"        "}</span>
      <span className="text-accent-sky">&quot;summary&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;Approved with 2 suggestions&quot;</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/40">{"}"}</span>
    </code>
  );
}

function DumpSessionCurlHighlighted() {
  return (
    <code>
      <span className="text-accent-emerald">curl</span>
      <span className="text-white/60"> -X POST </span>
      <span className="text-accent-sky">https://api.platon.dev/sessions</span>
      <span className="text-white/30"> \</span>{"\n"}
      <span className="text-white/60">{"  "}-H </span>
      <span className="text-accent-emerald">&quot;payment-signature: $X402_ACCESS_TOKEN&quot;</span>
      <span className="text-white/30"> \</span>{"\n"}
      <span className="text-white/60">{"  "}-H </span>
      <span className="text-accent-emerald">&quot;Content-Type: application/json&quot;</span>
      <span className="text-white/30"> \</span>{"\n"}
      <span className="text-white/60">{"  "}-d </span>
      <span className="text-accent-emerald">&apos;{"{"}</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-violet">&quot;agentKind&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;code-reviewer&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-violet">&quot;agentId&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;reviewer-prod-01&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-violet">&quot;sessionId&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;sess-20260305-a7x&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-violet">&quot;task&quot;</span>
      <span className="text-white/40">: {"{"} </span>
      <span className="text-accent-sky">&quot;kind&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;review&quot;</span>
      <span className="text-white/40">, </span>
      <span className="text-accent-sky">&quot;summary&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;Review PR #142&quot;</span>
      <span className="text-white/40"> {"}"}</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-violet">&quot;outcome&quot;</span>
      <span className="text-white/40">: {"{"} </span>
      <span className="text-accent-sky">&quot;status&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;success&quot;</span>
      <span className="text-white/40">, </span>
      <span className="text-accent-sky">&quot;summary&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;Approved&quot;</span>
      <span className="text-white/40"> {"}"}</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-violet">&quot;tools&quot;</span>
      <span className="text-white/40">: [{"{"} </span>
      <span className="text-accent-sky">&quot;name&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;read_file&quot;</span>
      <span className="text-white/40">, </span>
      <span className="text-accent-sky">&quot;category&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;filesystem&quot;</span>
      <span className="text-white/40"> {"}"}]</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-violet">&quot;errors&quot;</span>
      <span className="text-white/40">: []</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-emerald">{"}"}&apos;</span>
    </code>
  );
}

function RetrieveContextMcpHighlighted() {
  return (
    <code>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;method&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;tools/call&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;params&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-sky">&quot;name&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-violet">&quot;memory.retrieve_context&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-sky">&quot;arguments&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;agentKind&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;code-reviewer&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;agentId&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;reviewer-prod-01&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;query&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;auth middleware best practices&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;limit&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-amber">5</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/40">{"}"}</span>
    </code>
  );
}

function RetrieveContextResponseHighlighted() {
  return (
    <code>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;results&quot;</span>
      <span className="text-white/40">: [</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;id&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;lrn-0042&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;type&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;learning&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;title&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;Always validate JWT expiry before claims&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;confidence&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-amber">0.92</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"}"}</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;id&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;lrn-0038&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;type&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;success_pattern&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;title&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;Wrap middleware in error boundary&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;confidence&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-amber">0.87</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-white/40">]</span>{"\n"}
      <span className="text-white/40">{"}"}</span>
    </code>
  );
}

function GetSimilarFailuresMcpHighlighted() {
  return (
    <code>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;method&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;tools/call&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;params&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-sky">&quot;name&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-violet">&quot;memory.get_similar_failures&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-accent-sky">&quot;arguments&quot;</span>
      <span className="text-white/40">: {"{"}</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;agentKind&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;code-reviewer&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;agentId&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;reviewer-prod-01&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;error&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-rose">&quot;TypeError: Cannot read properties of undefined (reading &apos;sub&apos;)&quot;</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/40">{"}"}</span>
    </code>
  );
}

function GetSimilarFailuresResponseHighlighted() {
  return (
    <code>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-accent-sky">&quot;results&quot;</span>
      <span className="text-white/40">: [</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"{"}</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;id&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;fail-0019&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;type&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-rose">&quot;failure&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;title&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;JWT payload missing &apos;sub&apos; claim&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;summary&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-emerald">&quot;Token from OAuth provider X omits &apos;sub&apos; when scope is limited. Resolution: fall back to &apos;email&apos; claim.&quot;</span>
      <span className="text-white/40">,</span>{"\n"}
      <span className="text-white/30">{"      "}</span>
      <span className="text-accent-violet">&quot;confidence&quot;</span>
      <span className="text-white/40">: </span>
      <span className="text-accent-amber">0.94</span>{"\n"}
      <span className="text-white/30">{"    "}</span>
      <span className="text-white/40">{"}"}</span>{"\n"}
      <span className="text-white/30">{"  "}</span>
      <span className="text-white/40">]</span>{"\n"}
      <span className="text-white/40">{"}"}</span>
    </code>
  );
}

function ClaudeDesktopHighlighted() {
  return <code>{claudeDesktopConfig}</code>;
}

function CursorConfigHighlighted() {
  return <code>{cursorConfig}</code>;
}

function CustomAgentHighlighted() {
  return <code>{customAgentTs}</code>;
}

/* ─── Main page ─── */
export default function HowItWorksPage() {
  return (
    <div className="relative overflow-hidden">
      {/* ═══ SECTION 0 — PAGE HEADER ═══ */}
      <section className="relative px-6 md:px-10 pt-24 pb-16 md:pt-32 md:pb-24">
        {/* Violet gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 0%, #2d1854 0%, #1a0a2e 40%, #09090b 80%)",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-10"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-4xl sm:text-5xl md:text-6xl font-light text-white leading-[1.1] tracking-tight mb-6"
          >
            From raw sessions to
            <br />
            agent intelligence
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-base md:text-lg text-white/50 max-w-xl leading-relaxed"
          >
            A developer guide to persistent agent memory. Learn how Platon&apos;s
            MCP tools turn every session into compounding intelligence for your
            AI agents.
          </motion.p>
        </div>
      </section>

      {/* ═══ SECTION 1 — THE CORE LOOP ═══ */}
      <section className="relative px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
              The core loop
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              Three stages that run automatically, making your agents smarter
              with every session.
            </p>
          </motion.div>

          {/* Architecture diagram */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <ArchCard
              icon={Play}
              title="Agent runs a task"
              description="Your agent executes — reviewing code, answering questions, deploying services. Session data is captured automatically."
              accentClass="bg-accent-sky"
              delay={0}
            />
            <AnimatedArrow delay={0.2} />
            <ArchCard
              icon={Sparkles}
              title="Platon reflects"
              description="The reflection engine analyzes the session, extracts learnings, identifies patterns, and scores confidence levels."
              accentClass="bg-accent-violet"
              delay={0.15}
            />
            <AnimatedArrow delay={0.35} />
            <ArchCard
              icon={Search}
              title="Agent retrieves context"
              description="Before the next task, the agent queries relevant memories — past learnings, failure patterns, and proven tactics."
              accentClass="bg-accent-emerald"
              delay={0.3}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center text-text-muted mt-12 text-sm"
          >
            This cycle runs automatically. Your agents get smarter with every
            session.
          </motion.p>
        </div>
      </section>

      {/* ═══ SECTION 2 — THE THREE MCP TOOLS ═══ */}
      <section className="relative px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
              The three MCP tools
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              Everything your agent needs to build persistent memory, in three
              simple tool calls.
            </p>
          </motion.div>

          {/* Tool A: dump_session */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start mb-24"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-amber-dim border border-accent-amber/20 mb-5">
                <Database className="w-3.5 h-3.5 text-accent-amber" />
                <span className="text-xs font-mono text-accent-amber">
                  memory.dump_session
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-light text-text-primary mb-4">
                Dump sessions after every task
              </h3>
              <p className="text-text-muted leading-relaxed mb-6">
                After your agent completes a task, dump the full session context.
                Include the task description, outcome status, tools used, events
                logged, and any errors encountered. Platon&apos;s reflection engine
                takes it from there.
              </p>
              <div className="space-y-3">
                {[
                  "sessionId — unique identifier for deduplication",
                  "task — kind + summary of what the agent did",
                  "outcome — success, failed, or partial with summary",
                  "tools — list of tools the agent invoked",
                  "errors — any errors with retry info",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-text-muted"
                  >
                    <ArrowRight className="w-4 h-4 text-accent-amber mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodePanel
              tabs={["MCP call", "curl"]}
              contents={[
                <DumpSessionMcpHighlighted key="mcp" />,
                <DumpSessionCurlHighlighted key="curl" />,
              ]}
              rawContents={[dumpSessionMcp, dumpSessionCurl]}
            />
          </motion.div>

          {/* Tool B: retrieve_context */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start mb-24"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-emerald-dim border border-accent-emerald/20 mb-5">
                <Search className="w-3.5 h-3.5 text-accent-emerald" />
                <span className="text-xs font-mono text-accent-emerald">
                  memory.retrieve_context
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-light text-text-primary mb-4">
                Retrieve context before every task
              </h3>
              <p className="text-text-muted leading-relaxed mb-6">
                Before starting work, query for relevant memories. Platon
                returns learnings, success patterns, and past session insights
                ranked by confidence. Your agent starts every task with the
                accumulated wisdom of all previous sessions.
              </p>
              <div className="space-y-3">
                {[
                  "query — natural language description of the upcoming task",
                  "limit — max results to return (default 5, max 20)",
                  "Results include confidence scores (0-1)",
                  "Types: learning, session, failure, success_pattern",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-text-muted"
                  >
                    <ArrowRight className="w-4 h-4 text-accent-emerald mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodePanel
              tabs={["MCP call", "Response"]}
              contents={[
                <RetrieveContextMcpHighlighted key="mcp" />,
                <RetrieveContextResponseHighlighted key="response" />,
              ]}
              rawContents={[retrieveContextMcp, retrieveContextResponse]}
            />
          </motion.div>

          {/* Tool C: get_similar_failures */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-rose-dim border border-accent-rose/20 mb-5">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-rose" />
                <span className="text-xs font-mono text-accent-rose">
                  memory.get_similar_failures
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-light text-text-primary mb-4">
                Learn from past failures
              </h3>
              <p className="text-text-muted leading-relaxed mb-6">
                When your agent hits an error, query for similar past failures.
                Platon returns matching failure patterns with resolutions that
                worked before — so your agent can fix issues it has never
                personally encountered.
              </p>
              <div className="space-y-3">
                {[
                  "error — the error message or description",
                  "Returns past failures with resolution summaries",
                  "Confidence scores indicate match quality",
                  "Agents learn from the entire fleet's mistakes",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-text-muted"
                  >
                    <ArrowRight className="w-4 h-4 text-accent-rose mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodePanel
              tabs={["MCP call", "Response"]}
              contents={[
                <GetSimilarFailuresMcpHighlighted key="mcp" />,
                <GetSimilarFailuresResponseHighlighted key="response" />,
              ]}
              rawContents={[getSimilarFailuresMcp, getSimilarFailuresResponse]}
            />
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 3 — INTEGRATION GUIDE ═══ */}
      <section className="relative px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
              Integrate in under two minutes
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              Copy-paste the config for your platform. Platon works as a
              standard MCP server with any compatible client.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <CodePanel
              tabs={["Claude Desktop", "Cursor", "Custom Agent (TS)"]}
              contents={[
                <ClaudeDesktopHighlighted key="claude" />,
                <CursorConfigHighlighted key="cursor" />,
                <CustomAgentHighlighted key="custom" />,
              ]}
              rawContents={[claudeDesktopConfig, cursorConfig, customAgentTs]}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center text-text-muted mt-8 text-sm"
          >
            Platon uses the x402 payment protocol via Nevermined for usage-based
            billing. No upfront commitment required.
          </motion.p>
        </div>
      </section>

      {/* ═══ SECTION 4 — AGENT LIFECYCLE TIMELINE ═══ */}
      <section className="relative px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
              A complete lifecycle
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              Follow an agent through a real-world cycle — from receiving a task
              to making the next one smarter.
            </p>
          </motion.div>

          <div className="space-y-0">
            <TimelineStep
              step={1}
              title="Agent receives a task"
              description="A code-review agent is assigned PR #142 — an auth middleware refactor touching JWT validation and session handling."
              icon={Rocket}
              accentClass="border-accent-sky text-accent-sky"
              index={0}
            />
            <TimelineStep
              step={2}
              title="Retrieves context from Platon"
              description='The agent calls memory.retrieve_context with the query "auth middleware JWT validation". Platon returns two high-confidence learnings from past sessions.'
              icon={Search}
              accentClass="border-accent-emerald text-accent-emerald"
              index={1}
            />
            <TimelineStep
              step={3}
              title="Executes with context"
              description="Armed with past learnings, the agent reviews the PR knowing to check JWT expiry validation and middleware error boundaries."
              icon={Brain}
              accentClass="border-accent-violet text-accent-violet"
              index={2}
            />
            <TimelineStep
              step={4}
              title="Encounters an error"
              description="The agent hits a TypeError when the test suite runs — Cannot read properties of undefined (reading 'sub')."
              icon={Bug}
              accentClass="border-accent-rose text-accent-rose"
              index={3}
            />
            <TimelineStep
              step={5}
              title="Queries similar failures"
              description="The agent calls memory.get_similar_failures. Platon returns a match: OAuth provider X omits 'sub' when scope is limited — fall back to 'email' claim."
              icon={HelpCircle}
              accentClass="border-accent-amber text-accent-amber"
              index={4}
            />
            <TimelineStep
              step={6}
              title="Completes task & dumps session"
              description="The agent resolves the issue, completes the review, and dumps the full session to Platon — including the error and its resolution."
              icon={CheckCircle2}
              accentClass="border-accent-emerald text-accent-emerald"
              index={5}
            />
            <TimelineStep
              step={7}
              title="Platon reflects — next task benefits"
              description="The reflection engine extracts a new learning about OAuth 'sub' claims. The next agent that reviews auth code will already know this."
              icon={TrendingUp}
              accentClass="border-accent-violet text-accent-violet"
              index={6}
            />
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5 — CTA ═══ */}
      <section className="relative px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6 leading-tight">
              Give your agents a memory
              <br />
              that compounds
            </h2>
            <p className="text-text-muted max-w-md mx-auto mb-10">
              Every session makes every agent smarter. Start building persistent
              memory into your agents today.
            </p>
            <div className="flex items-center justify-center gap-10">
              <Link
                href="/dashboard"
                className="group inline-flex flex-col items-center"
              >
                <span className="flex items-center gap-2 text-base font-medium text-text-primary tracking-wide">
                  Open Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="h-px w-full bg-border-default mt-2 group-hover:bg-accent-violet transition-colors" />
              </Link>
              <Link
                href="/spec"
                className="group inline-flex flex-col items-center"
              >
                <span className="flex items-center gap-2 text-base font-medium text-text-secondary tracking-wide group-hover:text-text-primary">
                  Read the Spec
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="h-px w-full bg-border-default mt-2 group-hover:bg-accent-violet transition-colors" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 6 — FOOTER ═══ */}
      <footer className="border-t border-border-default/50 px-6 md:px-10 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-accent-violet flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-text-secondary">
              Platon
            </span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "Product", href: "/#products" },
              { label: "How It Works", href: "/how-it-works" },
              { label: "Spec", href: "/spec" },
              { label: "Dashboard", href: "/dashboard" },
              { label: "GitHub", href: "#" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <span className="text-xs text-text-muted">
            &copy; 2026 Platon. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
