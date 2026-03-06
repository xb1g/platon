import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  readAdminSessionToken,
  verifyAdminPassword,
} from "../lib/admin/auth";

describe("admin auth", () => {
  it('accepts "bigf" as the default password', () => {
    expect(verifyAdminPassword("bigf", {})).toBe(true);
    expect(verifyAdminPassword("wrong", {})).toBe(false);
  });

  it("creates and verifies signed admin session tokens", () => {
    const token = createAdminSessionToken({
      env: { ADMIN_COOKIE_SECRET: "test-secret" },
      now: 1_700_000_000_000,
    });

    expect(
      readAdminSessionToken(token, {
        env: { ADMIN_COOKIE_SECRET: "test-secret" },
        now: 1_700_000_100_000,
      }),
    ).toEqual({
      role: "admin",
      issuedAt: 1_700_000_000_000,
      expiresAt: 1_700_043_200_000,
    });
  });

  it("rejects tampered and expired tokens", () => {
    const token = createAdminSessionToken({
      env: { ADMIN_COOKIE_SECRET: "test-secret" },
      now: 1_700_000_000_000,
    });

    expect(
      readAdminSessionToken(`${token}tampered`, {
        env: { ADMIN_COOKIE_SECRET: "test-secret" },
        now: 1_700_000_100_000,
      }),
    ).toBeNull();

    expect(
      readAdminSessionToken(token, {
        env: { ADMIN_COOKIE_SECRET: "test-secret" },
        now: 1_700_043_200_001,
      }),
    ).toBeNull();
  });
});
