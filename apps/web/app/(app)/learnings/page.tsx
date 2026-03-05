"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SearchBar } from "@/components/search-bar";
import { LearningCard } from "@/components/learning-card";
import { mockLearnings } from "@/lib/mock-data";
import clsx from "clsx";

type SortMode = "confidence" | "recent";
type TypeFilter = "all" | "learning" | "failure" | "success_pattern";

export default function LearningsPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("confidence");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [minConfidence, setMinConfidence] = useState(0);

  const filtered = useMemo(() => {
    let result = mockLearnings;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.agentId.toLowerCase().includes(q) ||
          l.tactics.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((l) => l.type === typeFilter);
    }

    result = result.filter((l) => l.confidence >= minConfidence);

    if (sort === "confidence") {
      result = [...result].sort((a, b) => b.confidence - a.confidence);
    } else {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  }, [search, sort, typeFilter, minConfidence]);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-text-primary">Learnings</h1>
        <p className="text-sm text-text-muted mt-1">
          Knowledge extracted from agent sessions
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <SearchBar
          placeholder="Search learnings..."
          value={search}
          onChange={setSearch}
          className="flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          {(["all", "learning", "failure", "success_pattern"] as TypeFilter[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  typeFilter === type
                    ? "bg-accent-violet-dim text-accent-violet border border-accent-violet/30"
                    : "bg-bg-tertiary text-text-muted hover:text-text-secondary border border-transparent"
                )}
              >
                {type === "all" ? "All" : type.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </motion.div>

      {/* Sort + confidence slider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-4 mb-6"
      >
        <div className="flex gap-1">
          <button
            onClick={() => setSort("confidence")}
            className={clsx(
              "px-3 py-1 rounded-md text-xs transition-colors",
              sort === "confidence"
                ? "bg-bg-tertiary text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            By confidence
          </button>
          <button
            onClick={() => setSort("recent")}
            className={clsx(
              "px-3 py-1 rounded-md text-xs transition-colors",
              sort === "recent"
                ? "bg-bg-tertiary text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            Most recent
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-text-muted">Min confidence:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence * 100}
            onChange={(e) => setMinConfidence(Number(e.target.value) / 100)}
            className="w-24 accent-accent-violet"
          />
          <span className="text-xs text-text-secondary w-8">
            {Math.round(minConfidence * 100)}%
          </span>
        </div>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((learning, i) => (
          <LearningCard key={learning.id} learning={learning} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-text-muted">No learnings match your filters</p>
        </motion.div>
      )}
    </div>
  );
}
