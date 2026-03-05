"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Bot,
  Wrench,
  FileText,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { SessionTimeline } from "@/components/session-timeline";
import { ConfidenceRing } from "@/components/confidence-ring";
import { mockSessions, mockReflections } from "@/lib/mock-data";

function formatDuration(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const session = mockSessions.find((s) => s.id === id);
  const reflection = mockReflections[id];
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [artifactsExpanded, setArtifactsExpanded] = useState(true);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Session Not Found</h2>
        <p className="text-sm text-text-muted mb-4">No session with ID &quot;{id}&quot;</p>
        <Link href="/sessions" className="text-accent-violet hover:underline text-sm">
          Back to sessions
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sessions
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary mb-1">
              {session.task.summary}
            </h1>
            <p className="text-sm text-text-muted">{session.id}</p>
          </div>
          <StatusBadge status={session.outcome.status} size="md" />
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Bot className="w-4 h-4" />
            <span>{session.agentId}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(session.duration)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <Wrench className="w-4 h-4" />
            <span>{session.tools.length} tools</span>
          </div>
          {session.humanFeedback && (
            <div className="flex items-center gap-1.5 text-accent-amber">
              <Star className="w-4 h-4" />
              <span>{session.humanFeedback.rating}/5</span>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-text-secondary">{session.outcome.summary}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="glass rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Event Timeline</h2>
            <SessionTimeline events={session.events} />
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tools */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-sm font-semibold text-text-primary mb-3">Tools Used</h3>
            <div className="flex flex-wrap gap-2">
              {session.tools.map((tool) => (
                <span
                  key={tool.name}
                  className="px-2.5 py-1 rounded-lg bg-bg-tertiary text-xs text-text-secondary hover:text-text-primary hover:bg-accent-violet-dim transition-colors cursor-default"
                  title={tool.category}
                >
                  {tool.name}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Artifacts */}
          {session.artifacts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-5"
            >
              <button
                onClick={() => setArtifactsExpanded(!artifactsExpanded)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h3 className="text-sm font-semibold text-text-primary">
                  Artifacts ({session.artifacts.length})
                </h3>
                {artifactsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>
              <AnimatePresence>
                {artifactsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {session.artifacts.map((art, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg bg-bg-tertiary/50"
                      >
                        <FileText className="w-3.5 h-3.5 mt-0.5 text-text-muted shrink-0" />
                        <div>
                          <span className="text-xs text-text-secondary block">
                            {art.summary || art.kind}
                          </span>
                          <span className="text-[10px] text-text-muted">{art.uri}</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Errors */}
          {session.errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass rounded-2xl p-5 border border-accent-rose/20"
            >
              <button
                onClick={() => setErrorsExpanded(!errorsExpanded)}
                className="w-full flex items-center justify-between mb-3"
              >
                <h3 className="text-sm font-semibold text-accent-rose flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Errors ({session.errors.length})
                </h3>
                {errorsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>
              <AnimatePresence>
                {errorsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {session.errors.map((err, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-lg bg-accent-rose-dim/50 text-xs"
                      >
                        <p className="text-accent-rose font-medium">{err.message}</p>
                        <div className="flex gap-3 mt-1 text-text-muted">
                          {err.code && <span>Code: {err.code}</span>}
                          <span>Retryable: {err.retryable ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Human Feedback */}
          {session.humanFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-5"
            >
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-accent-amber" />
                Human Feedback
              </h3>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-4 h-4 ${
                      n <= session.humanFeedback!.rating
                        ? "text-accent-amber fill-accent-amber"
                        : "text-bg-tertiary"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-text-secondary">{session.humanFeedback.summary}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Reflection */}
      {reflection && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent-amber" />
              Reflection
            </h2>
            <ConfidenceRing value={reflection.confidence} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reflection.wentWell.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-accent-emerald uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Went Well
                </h4>
                <ul className="space-y-1.5">
                  {reflection.wentWell.map((item, i) => (
                    <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                      <span className="text-accent-emerald mt-1">&#x203A;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reflection.wentWrong.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-accent-rose uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Went Wrong
                </h4>
                <ul className="space-y-1.5">
                  {reflection.wentWrong.map((item, i) => (
                    <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                      <span className="text-accent-rose mt-1">&#x203A;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {reflection.learnings.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border-default">
              <h4 className="text-xs font-semibold text-accent-amber uppercase tracking-wider mb-3">
                Key Learnings
              </h4>
              <div className="space-y-2">
                {reflection.learnings.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-tertiary/50"
                  >
                    <span className="text-sm text-text-secondary">{l.title}</span>
                    <ConfidenceRing value={l.confidence} size={32} strokeWidth={3} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {reflection.reusableTactics.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-default">
              <h4 className="text-xs font-semibold text-accent-violet uppercase tracking-wider mb-2">
                Reusable Tactics
              </h4>
              <div className="flex flex-wrap gap-2">
                {reflection.reusableTactics.map((tactic, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-accent-violet-dim text-xs text-accent-violet"
                  >
                    {tactic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
