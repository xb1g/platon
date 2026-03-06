import { ADMIN_SESSION_COOKIE_NAME, isProductionAdminCookie } from "./config";
import { getAdminSessionDurationSeconds } from "./auth";

type AdminEnv = Partial<Record<string, string | undefined>>;

export const getAdminSessionCookieOptions = (env: AdminEnv = process.env) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProductionAdminCookie(env),
  path: "/admin",
  maxAge: getAdminSessionDurationSeconds(),
});

export const buildClearedAdminSessionCookieOptions = (
  env: AdminEnv = process.env,
) => ({
  ...getAdminSessionCookieOptions(env),
  maxAge: 0,
});

const serializeCookie = (
  name: string,
  value: string,
  options: ReturnType<typeof getAdminSessionCookieOptions>,
) => {
  const parts = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
  ];

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
};

export const buildAdminSessionCookieHeader = (
  value: string,
  env: AdminEnv = process.env,
) =>
  serializeCookie(
    ADMIN_SESSION_COOKIE_NAME,
    value,
    getAdminSessionCookieOptions(env),
  );

export const buildClearedAdminSessionCookieHeader = (
  env: AdminEnv = process.env,
) =>
  serializeCookie(
    ADMIN_SESSION_COOKIE_NAME,
    "",
    buildClearedAdminSessionCookieOptions(env),
  );

export { ADMIN_SESSION_COOKIE_NAME };
