import React from "react";

export function AdminMetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
      <div className="text-xs uppercase tracking-[0.24em] text-text-muted">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-text-primary">{value}</div>
      {detail ? <div className="mt-2 text-sm text-text-secondary">{detail}</div> : null}
    </div>
  );
}
