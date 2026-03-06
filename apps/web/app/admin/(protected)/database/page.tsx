import React from "react";
import { DatabaseBrowser } from "../../../../components/admin/database-browser";
import { getAdminDatabaseData, normalizeAdminError } from "../../../../lib/admin/queries";

export default async function AdminDatabasePage() {
  try {
    const data = await getAdminDatabaseData();

    return (
      <div className="space-y-6">
        <section>
          <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
            Database
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-text-primary">
            Read-only Postgres browser
          </h2>
        </section>

        <DatabaseBrowser tables={data.tables} />
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-3xl border border-accent-rose/30 bg-accent-rose-dim p-6">
        <h2 className="text-xl font-semibold text-text-primary">
          Database unavailable
        </h2>
        <p className="mt-3 text-sm text-rose-100">
          {normalizeAdminError(error, "Failed to read Postgres tables.")}
        </p>
      </div>
    );
  }
}
