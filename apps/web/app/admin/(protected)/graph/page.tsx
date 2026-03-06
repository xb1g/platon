import React from "react";
import { AdminMetricCard } from "../../../../components/admin/admin-metric-card";
import { GraphBrowser } from "../../../../components/admin/graph-browser";
import { getAdminGraphData, getAdminSubscriberGraphData, listAdminSubscribers } from "../../../../lib/admin/queries";

type GraphPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminGraphPage({ searchParams }: GraphPageProps) {
  const params = await searchParams;
  const subscriberId =
    typeof params.subscriberId === "string" && params.subscriberId.length > 0
      ? params.subscriberId
      : null;

  const [allData, subscribers, subscriberGraph] = await Promise.all([
    subscriberId ? Promise.resolve(null) : getAdminGraphData(),
    listAdminSubscribers(),
    subscriberId ? getAdminSubscriberGraphData(subscriberId) : Promise.resolve(null),
  ]);

  const summary = allData?.summary ?? null;

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

      {!subscriberId && (
        <section className="grid gap-4 md:grid-cols-4">
          <AdminMetricCard
            label="Namespaces"
            value={String(summary?.namespaceCount ?? 0)}
          />
          <AdminMetricCard
            label="Session Nodes"
            value={String(summary?.sessionCount ?? 0)}
          />
          <AdminMetricCard
            label="Learning Nodes"
            value={String(summary?.learningCount ?? 0)}
          />
          <AdminMetricCard
            label="Relationships"
            value={String(summary?.relationshipCount ?? 0)}
          />
        </section>
      )}

      <GraphBrowser
        labelCounts={allData?.labelCounts ?? []}
        relationshipCounts={allData?.relationshipCounts ?? []}
        recentNodes={allData?.recentNodes ?? []}
        queue={allData?.queue ?? null}
        subscribers={subscribers}
        selectedSubscriberId={subscriberId}
        subscriberGraph={subscriberGraph}
      />
    </div>
  );
}
