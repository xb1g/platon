import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminCookieSecret,
  getAdminPassword,
  getNeo4jConfig,
  getPostgresConnectionString,
  getRedisUrl,
} from "../lib/admin/config";

describe("admin config", () => {
  it('defaults the admin password to "bigf"', () => {
    expect(getAdminPassword({})).toBe("bigf");
  });

  it("uses a stable development cookie secret by default", () => {
    expect(getAdminCookieSecret({})).toBe("platon-admin-dev-secret");
    expect(ADMIN_SESSION_COOKIE_NAME).toBe("platon_admin_session");
  });

  it("reads backend connection values from server env", () => {
    expect(
      getPostgresConnectionString({
        DATABASE_URL: "postgres://example/db",
        NEXT_PUBLIC_API_URL: "https://public.example",
      }),
    ).toBe("postgres://example/db");

    expect(
      getNeo4jConfig({
        NEO4J_URI: "bolt://graph:7687",
        NEO4J_USER: "neo4j",
        NEO4J_PASSWORD: "secret",
      }),
    ).toEqual({
      uri: "bolt://graph:7687",
      username: "neo4j",
      password: "secret",
    });

    expect(getRedisUrl({ REDIS_URL: "redis://cache:6379" })).toBe(
      "redis://cache:6379",
    );
  });
});
