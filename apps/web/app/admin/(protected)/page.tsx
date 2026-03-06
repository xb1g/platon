import React from "react";
import { AdminMetricCard } from "../../../components/admin/admin-metric-card";
import { BackendStatusPanel } from "../../../components/admin/backend-status-panel";
import { getAdminOverviewData } from "../../../lib/admin/queries";

export default async function AdminOverviewPage() {
  const data = await getAdminOverviewData();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
          Overview
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">
          Live backend state
        </h2>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminMetricCard
          label="Total Sessions"
          value={String(data.metrics.totalSessions)}
        />
        <AdminMetricCard
          label="Recent Failures"
          value={String(data.metrics.recentFailures)}
        />
        <AdminMetricCard
          label="Distinct Agents"
          value={String(data.metrics.distinctAgents)}
        />
        <AdminMetricCard
          label="Feedback Rows"
          value={String(data.metrics.retrievalFeedbackCount)}
        />
        <AdminMetricCard
          label="Vector Rows"
          value={String(data.metrics.vectorCount)}
        />
        <AdminMetricCard
          label="Queue Depth"
          value={String(data.metrics.queueDepth)}
          detail={
            data.metrics.latestSessionAt
              ? `Latest ingestion ${new Date(data.metrics.latestSessionAt).toLocaleString()}`
              : "No sessions recorded yet"
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <BackendStatusPanel name="Postgres" status={data.services.postgres} />
        <BackendStatusPanel name="Neo4j" status={data.services.neo4j} />
        <BackendStatusPanel name="Redis / BullMQ" status={data.services.redis} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h3 className="text-lg font-semibold text-text-primary">Graph Summary</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <AdminMetricCard
            label="Namespaces"
            value={String(data.graph.namespaceCount)}
          />
          <AdminMetricCard label="Sessions" value={String(data.graph.sessionCount)} />
          <AdminMetricCard
            label="Learnings"
            value={String(data.graph.learningCount)}
          />
          <AdminMetricCard
            label="Relationships"
            value={String(data.graph.relationshipCount)}
          />
        </div>
      </section>
    </div>
  );
}
