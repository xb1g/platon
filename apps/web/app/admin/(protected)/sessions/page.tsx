import React from "react";
import { AdminSessionTable } from "../../../../components/admin/admin-session-table";
import { SessionFilterForm } from "../../../../components/admin/session-filter-form";
import { getAdminSessionsPageData } from "../../../../lib/admin/queries";

type SessionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSessionsPage({
  searchParams,
}: SessionsPageProps) {
  const data = await getAdminSessionsPageData({
    searchParams: await searchParams,
  });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
          Sessions
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-text-primary">
          Raw session ingestion
        </h2>
      </section>

      <SessionFilterForm filters={data.filters} />

      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>
          Page {data.page} of {data.totalPages}
        </span>
        <span>{data.total} total rows</span>
      </div>

      <AdminSessionTable rows={data.rows} />
    </div>
  );
}
