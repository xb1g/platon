"use client";

import clsx from "clsx";

const statusConfig = {
  success: {
    dot: "bg-accent-emerald",
    bg: "bg-accent-emerald-dim",
    text: "text-accent-emerald",
    label: "Success",
  },
  failed: {
    dot: "bg-accent-rose",
    bg: "bg-accent-rose-dim",
    text: "text-accent-rose",
    label: "Failed",
  },
  partial: {
    dot: "bg-accent-amber",
    bg: "bg-accent-amber-dim",
    text: "text-accent-amber",
    label: "Partial",
  },
} as const;

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: "success" | "failed" | "partial";
  size?: "sm" | "md";
}) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bg,
        config.text,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span
        className={clsx("rounded-full", config.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")}
      />
      {config.label}
    </span>
  );
}
