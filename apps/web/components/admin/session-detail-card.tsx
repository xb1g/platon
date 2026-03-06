import React from "react";
import type { AdminFeedbackRow, AdminSessionDetail } from "../../lib/admin/postgres";

export function SessionDetailCard({
  session,
  feedback,
}: {
  session: AdminSessionDetail;
  feedback: AdminFeedbackRow[];
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Session Metadata</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">Subscriber</dt>
              <dd className="text-text-primary">{session.subscriberId}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Agent</dt>
              <dd className="text-text-primary">
                {session.agentKind} / {session.agentId}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Outcome</dt>
              <dd className="text-text-primary">{session.outcomeStatus}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Reflection</dt>
              <dd className="text-text-primary">{session.reflectionStatus}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Timing</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">Created</dt>
              <dd className="text-text-primary">
                {new Date(session.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Queued</dt>
              <dd className="text-text-primary">
                {session.reflectionEnqueuedAt
                  ? new Date(session.reflectionEnqueuedAt).toLocaleString()
                  : "Not queued"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Completed</dt>
              <dd className="text-text-primary">
                {session.reflectionCompletedAt
                  ? new Date(session.reflectionCompletedAt).toLocaleString()
                  : "Pending"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-text-primary">Payload JSON</h2>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-text-secondary">
          {JSON.stringify(session.payloadJson, null, 2)}
        </pre>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-lg font-semibold text-text-primary">
          Namespace Feedback
        </h2>
        {feedback.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            No retrieval feedback rows found for this namespace.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="text-sm font-medium text-text-primary">
                  {item.memoryId}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                  {item.verdict}
                </div>
                {item.queryText ? (
                  <div className="mt-2 text-sm text-text-secondary">
                    {item.queryText}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
