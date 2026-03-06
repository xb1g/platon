import React from "react";

type Filters = {
  subscriberId?: string;
  agentKind?: string;
  agentId?: string;
  sessionId?: string;
  outcomeStatus?: string;
  reflectionStatus?: string;
};

const fields: { name: keyof Filters; label: string }[] = [
  { name: "subscriberId", label: "Subscriber" },
  { name: "agentKind", label: "Agent Kind" },
  { name: "agentId", label: "Agent ID" },
  { name: "sessionId", label: "Session ID" },
  { name: "outcomeStatus", label: "Outcome" },
  { name: "reflectionStatus", label: "Reflection" },
];

export function SessionFilterForm({ filters }: { filters: Filters }) {
  return (
    <form className="grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-text-muted">
            {field.label}
          </span>
          <input
            type="text"
            name={field.name}
            defaultValue={filters[field.name] ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-primary outline-none focus:border-accent-sky"
          />
        </label>
      ))}

      <div className="flex items-end gap-3">
        <button
          type="submit"
          className="rounded-2xl bg-accent-sky px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Apply filters
        </button>
        <a
          href="/admin/sessions"
          className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-text-secondary"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
