import React from "react";
import type { AdminServiceState } from "../../lib/admin/queries";

export function BackendStatusPanel({
  name,
  status,
}: {
  name: string;
  status: AdminServiceState;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{name}</h3>
        <span
          className={`rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${
            status.ok
              ? "bg-accent-emerald-dim text-accent-emerald"
              : "bg-accent-rose-dim text-accent-rose"
          }`}
        >
          {status.ok ? "Healthy" : "Error"}
        </span>
      </div>
      <p className="mt-3 text-sm text-text-secondary">
        {status.ok ? status.summary : status.error}
      </p>
    </div>
  );
}
