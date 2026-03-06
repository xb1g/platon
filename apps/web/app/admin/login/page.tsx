import React from "react";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,_#050816,_#09090b)] px-6 py-12 text-text-primary">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-[0_24px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
          <section className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-12">
            <p className="text-xs uppercase tracking-[0.32em] text-accent-sky">
              Platon Admin
            </p>
            <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">
              Read-only live memory ops for every agent namespace.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-text-secondary">
              Browse raw session ingestion, retrieval feedback, vector records,
              graph summaries, and reflection queue health from the real
              backend. No mock data, no write controls.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-accent-emerald">
                  Postgres
                </div>
                <div className="mt-2 text-text-primary">Sessions + feedback</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-accent-amber">
                  Neo4j
                </div>
                <div className="mt-2 text-text-primary">Graph + learnings</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-accent-rose">
                  Redis
                </div>
                <div className="mt-2 text-text-primary">Reflection queue</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-accent-violet">
                  Access
                </div>
                <div className="mt-2 text-text-primary">Password-protected</div>
              </div>
            </div>
          </section>

          <section className="bg-black/20 p-8 lg:p-12">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-semibold">Admin Sign In</h2>
              <p className="mt-3 text-sm text-text-secondary">
                Enter the admin password to unlock the live operational view.
              </p>

              <form action="/admin/auth" method="POST" className="mt-8 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-text-muted">
                    Password
                  </span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-sky"
                  />
                </label>

                {hasError ? (
                  <p className="rounded-2xl border border-accent-rose/40 bg-accent-rose-dim px-4 py-3 text-sm text-rose-100">
                    Invalid password.
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-accent-sky px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Open Admin Dashboard
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
