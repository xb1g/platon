import React from "react";
import type { AdminTableSnapshot } from "../../lib/admin/postgres";

export function DatabaseBrowser({ tables }: { tables: AdminTableSnapshot[] }) {
  return (
    <div className="space-y-6">
      {tables.map((table) => (
        <section
          key={table.name}
          className="rounded-3xl border border-white/10 bg-black/20 p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {table.name}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {table.rowCount} rows
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-text-muted">
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} className="px-3 py-2 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index} className="border-t border-white/5">
                    {table.columns.map((column) => (
                      <td key={column} className="px-3 py-3 align-top text-text-secondary">
                        {row[column] == null ? "null" : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
