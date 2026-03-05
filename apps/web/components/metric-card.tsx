"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { sparklineData } from "@/lib/mock-data";

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  index = 0,
}: {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  color: string;
  index?: number;
}) {
  const colorMap: Record<string, { bg: string; text: string; hex: string }> = {
    violet: { bg: "bg-accent-violet-dim", text: "text-accent-violet", hex: "#8b5cf6" },
    emerald: { bg: "bg-accent-emerald-dim", text: "text-accent-emerald", hex: "#10b981" },
    amber: { bg: "bg-accent-amber-dim", text: "text-accent-amber", hex: "#f59e0b" },
    sky: { bg: "bg-accent-sky-dim", text: "text-accent-sky", hex: "#0ea5e9" },
    rose: { bg: "bg-accent-rose-dim", text: "text-accent-rose", hex: "#f43f5e" },
  };

  const c = colorMap[color] || colorMap.violet;
  const spark = sparklineData(50, 20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="glass glass-hover rounded-2xl p-5 cursor-default group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <MiniSparkline data={spark} color={c.hex} />
      </div>
      <div className="text-2xl font-bold text-text-primary mb-1">{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted">{title}</span>
        {change && (
          <span
            className={`text-xs font-medium ${
              change.startsWith("+") ? "text-accent-emerald" : "text-accent-rose"
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
