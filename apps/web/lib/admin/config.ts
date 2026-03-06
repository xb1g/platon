type AdminEnv = Partial<Record<string, string | undefined>>;

export const ADMIN_SESSION_COOKIE_NAME = "platon_admin_session";
const DEFAULT_ADMIN_PASSWORD = "bigf";
const DEFAULT_ADMIN_COOKIE_SECRET = "platon-admin-dev-secret";
const DEFAULT_DATABASE_URL = "postgres://postgres:password@localhost:5432/memory";
const DEFAULT_NEO4J_URI = "bolt://localhost:7687";
const DEFAULT_NEO4J_USER = "neo4j";
const DEFAULT_NEO4J_PASSWORD = "password";
const DEFAULT_REDIS_URL = "redis://localhost:6379";

export const getAdminPassword = (env: AdminEnv = process.env) =>
  env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

export const getAdminCookieSecret = (env: AdminEnv = process.env) =>
  env.ADMIN_COOKIE_SECRET ?? DEFAULT_ADMIN_COOKIE_SECRET;

export const isProductionAdminCookie = (env: AdminEnv = process.env) =>
  env.NODE_ENV === "production";

export const getPostgresConnectionString = (env: AdminEnv = process.env) =>
  env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

export const getNeo4jConfig = (env: AdminEnv = process.env) => ({
  uri: env.NEO4J_URI ?? DEFAULT_NEO4J_URI,
  username: env.NEO4J_USER ?? DEFAULT_NEO4J_USER,
  password: env.NEO4J_PASSWORD ?? DEFAULT_NEO4J_PASSWORD,
});

export const getRedisUrl = (env: AdminEnv = process.env) =>
  env.REDIS_URL ?? DEFAULT_REDIS_URL;
