"use client";

import { motion } from "framer-motion";
import {
  Play,
  Wrench,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Heart,
  Cpu,
  FileText,
} from "lucide-react";

const eventTypeConfig: Record<string, { icon: typeof Play; color: string }> = {
  start: { icon: Play, color: "text-accent-sky" },
  tool_call: { icon: Wrench, color: "text-accent-violet" },
  analysis: { icon: Search, color: "text-accent-amber" },
  fix: { icon: CheckCircle2, color: "text-accent-emerald" },
  complete: { icon: CheckCircle2, color: "text-accent-emerald" },
  error: { icon: XCircle, color: "text-accent-rose" },
  retry: { icon: RefreshCw, color: "text-accent-amber" },
  warning: { icon: AlertTriangle, color: "text-accent-amber" },
  comment: { icon: MessageSquare, color: "text-accent-sky" },
  finding: { icon: Search, color: "text-accent-amber" },
  health_check: { icon: Heart, color: "text-accent-emerald" },
  processing: { icon: Cpu, color: "text-accent-violet" },
};

export function SessionTimeline({
  events,
}: {
  events: { type: string; summary: string }[];
}) {
  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border-default" />

      <div className="space-y-1">
        {events.map((event, i) => {
          const config = eventTypeConfig[event.type] || { icon: FileText, color: "text-text-muted" };
          const IconComp = config.icon;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="relative flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-bg-tertiary/30 transition-colors group"
            >
              {/* Dot on timeline */}
              <div className="absolute -left-6 top-3.5 w-[9px] h-[9px] rounded-full bg-bg-secondary border-2 border-border-default group-hover:border-accent-violet transition-colors" />

              <IconComp className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
              <div>
                <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {event.summary}
                </p>
                <span className="text-xs text-text-muted capitalize">{event.type.replace("_", " ")}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
