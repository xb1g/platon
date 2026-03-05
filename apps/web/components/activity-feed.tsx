"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { activityFeed } from "@/lib/mock-data";

const typeIcon = {
  success: { icon: CheckCircle2, color: "text-accent-emerald" },
  failed: { icon: XCircle, color: "text-accent-rose" },
  partial: { icon: AlertTriangle, color: "text-accent-amber" },
  learning: { icon: Lightbulb, color: "text-accent-sky" },
} as const;

export function ActivityFeed() {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Activity</h3>
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
        {activityFeed.map((item, i) => {
          const config = typeIcon[item.type as keyof typeof typeIcon] || typeIcon.success;
          const IconComp = config.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-tertiary/50 transition-colors cursor-default group"
            >
              <IconComp className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  {item.summary}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-muted">{item.agent}</span>
                  <span className="text-xs text-text-muted">·</span>
                  <span className="text-xs text-text-muted">{item.time}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
