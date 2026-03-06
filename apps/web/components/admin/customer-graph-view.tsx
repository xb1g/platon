import React from "react";
import type { AdminSubscriberGraphData } from "../../lib/admin/queries";

function statusStyle(status: string | null) {
  switch (status) {
    case "published":
      return "text-emerald-400 bg-emerald-400/10";
    case "candidate":
      return "text-amber-400 bg-amber-400/10";
    case "suppressed":
    case "quarantined":
      return "text-red-400 bg-red-400/10";
    default:
      return "text-text-muted bg-white/5";
  }
}

export function CustomerGraphView({ data }: { data: AdminSubscriberGraphData }) {
  return (
    <div className="space-y-6">
      {/* Top metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
          <div className="text-xs uppercase tracking-[0.24em] text-text-muted">
            Namespaces
          </div>
          <div className="mt-3 text-3xl font-semibold text-text-primary">
            {data.namespaceCount}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
          <div className="text-xs uppercase tracking-[0.24em] text-text-muted">
            Sessions
          </div>
          <div className="mt-3 text-3xl font-semibold text-text-primary">
            {data.sessionCount}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
          <div className="text-xs uppercase tracking-[0.24em] text-text-muted">
            Learnings
          </div>
          <div className="mt-3 text-3xl font-semibold text-text-primary">
            {data.learningCount}
          </div>
        </div>
      </div>

      {/* Namespaces section */}
      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-text-primary">Namespaces</h2>
        {data.namespaces.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">No namespaces found.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.namespaces.map((ns) => (
              <div
                key={ns.namespaceId}
                className="rounded-2xl bg-white/5 p-4"
              >
                <div className="text-sm font-medium text-text-primary">
                  {ns.agentKind}
                  {ns.agentId ? (
                    <span className="ml-1.5 text-text-secondary">
                      / {ns.agentId}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-xs text-text-secondary">
                    <span className="text-text-primary">{ns.sessionCount}</span>
                    {" sessions"}
                  </span>
                  <span className="text-xs text-text-secondary">
                    <span className="text-text-primary">{ns.learningCount}</span>
                    {" learnings"}
                  </span>
                </div>
                <div className="mt-2 truncate text-xs text-text-muted">
                  {ns.namespaceId}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Learnings section */}
      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-text-primary">
          Recent Learnings
        </h2>
        {data.recentLearnings.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">No learnings found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.recentLearnings.map((learning) => (
              <div key={learning.id} className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    {learning.title}
                  </span>
                  {learning.status != null ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] ${statusStyle(learning.status)}`}
                    >
                      {learning.status}
                    </span>
                  ) : null}
                </div>
                {(learning.confidence != null ||
                  learning.qualityScore != null) && (
                  <div className="mt-2 flex items-center gap-4">
                    {learning.confidence != null && (
                      <span className="text-xs text-text-muted">
                        confidence{" "}
                        <span className="text-text-secondary">
                          {learning.confidence.toFixed(2)}
                        </span>
                      </span>
                    )}
                    {learning.qualityScore != null && (
                      <span className="text-xs text-text-muted">
                        quality{" "}
                        <span className="text-text-secondary">
                          {learning.qualityScore.toFixed(2)}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
