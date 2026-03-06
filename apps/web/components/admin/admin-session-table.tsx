import React from "react";
import Link from "next/link";
import type { AdminSessionListRow } from "../../lib/admin/postgres";

export function AdminSessionTable({
  rows,
}: {
  rows: AdminSessionListRow[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
              <th className="px-4 py-3 font-medium">Reflection</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="px-4 py-4 align-top">
                  <Link
                    href={`/admin/sessions/${row.id}`}
                    className="font-medium text-accent-sky"
                  >
                    {row.sessionId}
                  </Link>
                  <div className="mt-1 text-xs text-text-muted">{row.taskKind}</div>
                  <div className="mt-1 max-w-sm text-text-secondary">
                    {row.taskSummary}
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-text-secondary">
                  <div>{row.agentKind}</div>
                  <div className="mt-1 text-xs text-text-muted">{row.agentId}</div>
                  <div className="mt-1 text-xs text-text-muted">
                    {row.subscriberId}
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="text-text-primary">{row.outcomeStatus}</div>
                  <div className="mt-1 max-w-xs text-text-secondary">
                    {row.outcomeSummary}
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="text-text-primary">{row.reflectionStatus}</div>
                  {row.reflectionError ? (
                    <div className="mt-1 max-w-xs text-xs text-accent-rose">
                      {row.reflectionError}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4 align-top text-text-secondary">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
