import React from "react";
import Link from "next/link";
import { SessionDetailCard } from "../../../../../components/admin/session-detail-card";
import { getAdminSessionDetailData } from "../../../../../lib/admin/queries";

type SessionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSessionDetailPage({
  params,
}: SessionDetailPageProps) {
  const { id } = await params;
  const data = await getAdminSessionDetailData(id);

  if (!data.session) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-xl font-semibold text-text-primary">
          Session not found
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          No `raw_sessions` row exists for `{id}`.
        </p>
        <Link href="/admin/sessions" className="mt-4 inline-block text-sm text-accent-sky">
          Back to sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
          Session Detail
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">
          {data.session.sessionId}
        </h2>
      </div>

      <SessionDetailCard session={data.session} feedback={data.feedback} />
    </div>
  );
}
