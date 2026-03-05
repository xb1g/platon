"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  ScrollText,
} from "lucide-react";
import { ConfidenceRing } from "@/components/confidence-ring";
import { mockLearnings, mockSessions } from "@/lib/mock-data";
import clsx from "clsx";

interface QueryResult {
  id: string;
  type: "learning" | "session" | "failure" | "success_pattern";
  title: string;
  summary: string;
  confidence: number;
}

const typeConfig = {
  learning: { icon: BookOpen, color: "text-accent-sky", bg: "bg-accent-sky-dim" },
  session: { icon: ScrollText, color: "text-accent-violet", bg: "bg-accent-violet-dim" },
  failure: { icon: AlertTriangle, color: "text-accent-rose", bg: "bg-accent-rose-dim" },
  success_pattern: { icon: TrendingUp, color: "text-accent-emerald", bg: "bg-accent-emerald-dim" },
} as const;

function simulateSearch(query: string): QueryResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();

  const learningResults: QueryResult[] = mockLearnings
    .filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.tactics.some((t) => t.toLowerCase().includes(q))
    )
    .map((l) => ({
      id: l.id,
      type: l.type,
      title: l.title,
      summary: l.tactics.join(". "),
      confidence: l.confidence,
    }));

  const sessionResults: QueryResult[] = mockSessions
    .filter(
      (s) =>
        s.task.summary.toLowerCase().includes(q) ||
        s.outcome.summary.toLowerCase().includes(q)
    )
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      type: "session" as const,
      title: s.task.summary,
      summary: s.outcome.summary,
      confidence: s.outcome.status === "success" ? 0.9 : s.outcome.status === "partial" ? 0.6 : 0.3,
    }));

  return [...learningResults, ...sessionResults]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

export default function PlaygroundPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(5);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 600));

    let res = simulateSearch(query);
    if (statusFilters.length > 0) {
      res = res.filter((r) => statusFilters.includes(r.type));
    }
    setResults(res.slice(0, limit));
    setLoading(false);
  }

  function toggleStatusFilter(s: string) {
    setStatusFilters((prev) =>
      prev.includes(s) ? prev.filter((f) => f !== s) : [...prev, s]
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-text-primary">Retrieval Playground</h1>
        <p className="text-sm text-text-muted mt-1">
          Query the agent memory graph interactively
        </p>
      </motion.div>

      {/* Query input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="glass rounded-2xl p-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-violet" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask anything about your agent memory..."
                className="w-full bg-transparent pl-12 pr-4 py-4 text-text-primary placeholder:text-text-muted outline-none text-base"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "p-3 rounded-xl transition-colors",
                showFilters ? "bg-accent-violet-dim text-accent-violet" : "text-text-muted hover:text-text-secondary"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || loading}
              className="px-6 py-3 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-accent-violet/90 disabled:opacity-40 transition-all"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Search className="w-5 h-5" />
                </motion.div>
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-2xl p-5 mt-3">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="text-xs text-text-muted mb-2 block">Result types</label>
                    <div className="flex gap-2">
                      {["learning", "failure", "success_pattern", "session"].map((type) => (
                        <button
                          key={type}
                          onClick={() => toggleStatusFilter(type)}
                          className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            statusFilters.includes(type)
                              ? "bg-accent-violet-dim text-accent-violet border border-accent-violet/30"
                              : "bg-bg-tertiary text-text-muted hover:text-text-secondary border border-transparent"
                          )}
                        >
                          {type.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-2 block">Max results</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="w-32 accent-accent-violet"
                      />
                      <span className="text-sm text-text-secondary w-6">{limit}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick queries */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            "deployment failures",
            "security vulnerabilities",
            "performance optimization",
            "testing patterns",
          ].map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
              }}
              className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-xs text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/80 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl p-5 animate-pulse"
              >
                <div className="h-4 bg-bg-tertiary rounded w-1/3 mb-3" />
                <div className="h-3 bg-bg-tertiary rounded w-2/3 mb-2" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
              </div>
            ))}
          </motion.div>
        )}

        {!loading && searched && results.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16"
          >
            <Search className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No results found for "{query}"</p>
            <p className="text-xs text-text-muted mt-1">Try a different query or adjust filters</p>
          </motion.div>
        )}

        {!loading && results.length > 0 && (
          <motion.div key="results" className="space-y-3">
            <p className="text-xs text-text-muted mb-2">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
            {results.map((result, i) => {
              const config = typeConfig[result.type] || typeConfig.learning;
              const IconComp = config.icon;

              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass glass-hover rounded-2xl p-5 cursor-default group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                        <IconComp className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
                            {result.type.replace("_", " ")}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-violet transition-colors mb-1">
                          {result.title}
                        </h3>
                        <p className="text-xs text-text-muted line-clamp-2">{result.summary}</p>
                      </div>
                    </div>
                    <ConfidenceRing value={result.confidence} size={44} strokeWidth={3} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!loading && !searched && (
          <motion.div
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-violet-dim flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-accent-violet" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Query your agent memory
            </h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              Search across learnings, sessions, failure patterns, and success strategies.
              Try one of the suggested queries above.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
