import React from "react";
import { AdminMetricCard } from "../../../../components/admin/admin-metric-card";
import { GraphBrowser } from "../../../../components/admin/graph-browser";
import { getAdminGraphData } from "../../../../lib/admin/queries";

export default async function AdminGraphPage() {
  const data = await getAdminGraphData();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
          Graph
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">
          Neo4j memory topology
        </h2>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Namespaces"
          value={String(data.summary?.namespaceCount ?? 0)}
        />
        <AdminMetricCard
          label="Session Nodes"
          value={String(data.summary?.sessionCount ?? 0)}
        />
        <AdminMetricCard
          label="Learning Nodes"
          value={String(data.summary?.learningCount ?? 0)}
        />
        <AdminMetricCard
          label="Relationships"
          value={String(data.summary?.relationshipCount ?? 0)}
        />
      </section>

      <GraphBrowser
        labelCounts={data.labelCounts}
        relationshipCounts={data.relationshipCounts}
        recentNodes={data.recentNodes}
        queue={data.queue}
      />
    </div>
  );
}
