import React from "react";
import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/database", label: "Database" },
  { href: "/admin/graph", label: "Graph" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#08101d,_#09090b)] text-text-primary">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-accent-sky">
              Platon Admin
            </p>
            <h1 className="mt-2 text-xl font-semibold">
              Live agent memory operations
            </h1>
          </div>

          <form action="/admin/logout" method="POST">
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary transition hover:border-white/20 hover:text-text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-secondary transition hover:border-accent-sky/30 hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </aside>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
