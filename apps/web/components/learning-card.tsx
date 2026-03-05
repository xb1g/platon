"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ConfidenceRing } from "./confidence-ring";
import type { MockLearning } from "@/lib/mock-data";
import clsx from "clsx";

const typeColors = {
  learning: { bg: "bg-accent-sky-dim", text: "text-accent-sky" },
  failure: { bg: "bg-accent-rose-dim", text: "text-accent-rose" },
  success_pattern: { bg: "bg-accent-emerald-dim", text: "text-accent-emerald" },
} as const;

export function LearningCard({
  learning,
  index = 0,
}: {
  learning: MockLearning;
  index?: number;
}) {
  const typeConfig = typeColors[learning.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="glass glass-hover rounded-2xl p-5 group cursor-default"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className={clsx(
            "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider",
            typeConfig.bg,
            typeConfig.text
          )}
        >
          {learning.type.replace("_", " ")}
        </span>
        <ConfidenceRing value={learning.confidence} size={40} strokeWidth={3} />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-text-primary mb-3 leading-relaxed">
        {learning.title}
      </h3>

      {/* Tactics */}
      {learning.tactics.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {learning.tactics.map((tactic, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-text-muted"
            >
              <span className="text-accent-violet mt-0.5">›</span>
              <span>{tactic}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border-default/50">
        <span className="text-xs text-text-muted">{learning.agentId}</span>
        <Link
          href={`/sessions/${learning.sessionId}`}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-violet transition-colors"
        >
          View session
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}
