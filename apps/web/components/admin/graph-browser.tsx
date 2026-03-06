import React from "react";
import type { AdminGraphCountRow, AdminRecentNode } from "../../lib/admin/neo4j";
import type { AdminQueueSummary } from "../../lib/admin/redis";
import type { AdminSubscriberSummary, AdminSubscriberGraphData } from "../../lib/admin/queries";
import { SubscriberSelector } from "./subscriber-selector";
import { CustomerGraphView } from "./customer-graph-view";

export function GraphBrowser({
  labelCounts,
  relationshipCounts,
  recentNodes,
  queue,
  subscribers,
  selectedSubscriberId,
  subscriberGraph,
}: {
  labelCounts: AdminGraphCountRow[];
  relationshipCounts: AdminGraphCountRow[];
  recentNodes: AdminRecentNode[];
  queue: AdminQueueSummary | null;
  subscribers: AdminSubscriberSummary[];
  selectedSubscriberId: string | null;
  subscriberGraph: AdminSubscriberGraphData | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SubscriberSelector
          subscribers={subscribers}
          selectedSubscriberId={selectedSubscriberId}
        />
        {selectedSubscriberId && (
          <span className="text-xs text-text-muted">
            {subscribers.find(s => s.subscriberId === selectedSubscriberId)?.namespaceCount ?? 0} namespace(s)
          </span>
        )}
      </div>

      {selectedSubscriberId && subscriberGraph ? (
        <CustomerGraphView data={subscriberGraph} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-lg font-semibold text-text-primary">Node Labels</h2>
            <div className="mt-4 space-y-3">
              {labelCounts.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-text-secondary">{item.name}</span>
                  <span className="text-text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Relationship Types
            </h2>
            <div className="mt-4 space-y-3">
              {relationshipCounts.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-text-secondary">{item.name}</span>
                  <span className="text-text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-lg font-semibold text-text-primary">Recent Nodes</h2>
            <div className="mt-4 space-y-3">
              {recentNodes.map((node) => (
                <div key={`${node.kind}-${node.id}`} className="rounded-2xl bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-text-muted">
                    {node.kind}
                  </div>
                  <div className="mt-2 text-sm font-medium text-text-primary">
                    {node.title}
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {node.id} {node.status ? `• ${node.status}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Reflection Queue
            </h2>
            {queue ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/5 p-4 text-text-secondary">
                    Waiting
                    <div className="mt-2 text-2xl text-text-primary">{queue.waiting}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 text-text-secondary">
                    Active
                    <div className="mt-2 text-2xl text-text-primary">{queue.active}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 text-text-secondary">
                    Completed
                    <div className="mt-2 text-2xl text-text-primary">{queue.completed}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 text-text-secondary">
                    Failed
                    <div className="mt-2 text-2xl text-text-primary">{queue.failed}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {queue.recentJobs.map((job) => (
                    <div key={job.id} className="rounded-2xl bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-text-primary">
                          {job.name}
                        </span>
                        <span className="text-xs uppercase tracking-[0.16em] text-text-muted">
                          {job.state}
                        </span>
                      </div>
                      <pre className="mt-3 overflow-x-auto text-xs text-text-secondary">
                        {JSON.stringify(job.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                Queue data is unavailable.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
