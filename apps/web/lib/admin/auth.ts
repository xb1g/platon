import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getAdminCookieSecret, getAdminPassword } from "./config";

type AdminEnv = Partial<Record<string, string | undefined>>;

type AdminSessionPayload = {
  role: "admin";
  issuedAt: number;
  expiresAt: number;
};

type CreateAdminSessionTokenOptions = {
  env?: AdminEnv;
  now?: number;
};

type ReadAdminSessionTokenOptions = {
  env?: AdminEnv;
  now?: number;
};

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const encodeBase64Url = (value: string) =>
  Buffer.from(value).toString("base64url");

const decodeBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string, env: AdminEnv = process.env) =>
  createHmac("sha256", getAdminCookieSecret(env)).update(payload).digest("base64url");

export const verifyAdminPassword = (
  password: string,
  env: AdminEnv = process.env,
) => {
  const expected = createHash("sha256").update(getAdminPassword(env)).digest();
  const actual = createHash("sha256").update(password).digest();

  return timingSafeEqual(expected, actual);
};

export const createAdminSessionToken = (
  options: CreateAdminSessionTokenOptions = {},
) => {
  const issuedAt = options.now ?? Date.now();
  const payload: AdminSessionPayload = {
    role: "admin",
    issuedAt,
    expiresAt: issuedAt + TWELVE_HOURS_MS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload, options.env)}`;
};

export const readAdminSessionToken = (
  token: string | undefined,
  options: ReadAdminSessionTokenOptions = {},
): AdminSessionPayload | null => {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, options.env);
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(providedSignature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as AdminSessionPayload;
  const now = options.now ?? Date.now();

  if (payload.role !== "admin" || payload.expiresAt <= now) {
    return null;
  }

  return payload;
};

export const getAdminSessionDurationSeconds = () => TWELVE_HOURS_MS / 1000;
