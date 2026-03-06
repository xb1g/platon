# `@memory/web`

Owns the developer dashboard for sessions, learnings, and memory inspection.

## Admin Dashboard

The web app now includes a read-only `/admin` area for live backend inspection.

Required server-side environment variables:

- `DATABASE_URL`
- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASSWORD`
- `REDIS_URL`

Optional admin auth overrides:

- `ADMIN_PASSWORD` defaults to `bigf`
- `ADMIN_COOKIE_SECRET` defaults to a dev-safe fallback and should be set explicitly in production

The admin surface reads real Postgres, Neo4j, and BullMQ or Redis data directly from server components. It does not use mock dashboard data.
