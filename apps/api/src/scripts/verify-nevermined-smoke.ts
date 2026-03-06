import { Payments } from "@nevermined-io/payments";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url))
});

const smokeEnvSchema = z.object({
  MEMORY_API_URL: z.string().url().default("http://localhost:3001"),
  NVM_AGENT_ID: z.string().min(1),
  NVM_PLAN_ID: z.string().min(1),
  NVM_ENVIRONMENT: z.enum(["sandbox", "live"]).default("sandbox"),
  NVM_SUBSCRIBER_API_KEY: z.string().min(1).optional()
});

type SmokeVerificationConfig = {
  apiUrl: string;
  agentId: string;
  planId: string;
  environment: "sandbox" | "live";
  hasSubscriberApiKey: boolean;
  subscriberApiKey?: string;
};

export const buildSmokeRetrievePayload = () => ({
  agentId: "smoke-agent",
  agentKind: "smoke-test",
  query: "find similar failures",
  limit: 3
});

export const parseSmokeVerificationEnv = (
  env: Partial<Record<string, string | undefined>>
): SmokeVerificationConfig => {
  const parsed = smokeEnvSchema.parse(env);

  return {
    apiUrl: parsed.MEMORY_API_URL.replace(/\/$/, ""),
    agentId: parsed.NVM_AGENT_ID,
    planId: parsed.NVM_PLAN_ID,
    environment: parsed.NVM_ENVIRONMENT,
    hasSubscriberApiKey: Boolean(parsed.NVM_SUBSCRIBER_API_KEY),
    subscriberApiKey: parsed.NVM_SUBSCRIBER_API_KEY
  };
};

const decodeBase64Json = (value: string | null) => {
  if (!value) {
    return null;
  }

  return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
};

const readHeader = (headers: Headers, name: string) => headers.get(name) ?? headers.get(name.toLowerCase());

export const runNeverminedSmokeVerification = async (
  env: Partial<Record<string, string | undefined>>
) => {
  const config = parseSmokeVerificationEnv(env);
  const payload = buildSmokeRetrievePayload();

  const preflightResponse = await fetch(`${config.apiUrl}/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (preflightResponse.status !== 402) {
    const body = await preflightResponse.text();
    throw new Error(`Expected 402 from /retrieve preflight, got ${preflightResponse.status}: ${body}`);
  }

  const paymentRequired = decodeBase64Json(readHeader(preflightResponse.headers, "payment-required"));

  console.log("402 preflight verified.");
  console.log(JSON.stringify({
    endpoint: `${config.apiUrl}/retrieve`,
    paymentRequired
  }, null, 2));

  if (!config.hasSubscriberApiKey || !config.subscriberApiKey) {
    console.log("Paid retry skipped. Set NVM_SUBSCRIBER_API_KEY to run the full Nevermined sandbox flow.");
    return;
  }

  const subscriberPayments = Payments.getInstance({
    nvmApiKey: config.subscriberApiKey,
    environment: config.environment
  });

  const { accessToken } = await subscriberPayments.x402.getX402AccessToken(
    config.planId,
    config.agentId
  );

  const paidResponse = await fetch(`${config.apiUrl}/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "payment-signature": accessToken
    },
    body: JSON.stringify(payload)
  });

  if (!paidResponse.ok) {
    const body = await paidResponse.text();
    throw new Error(`Paid retry failed with ${paidResponse.status}: ${body}`);
  }

  const paymentResponse = decodeBase64Json(readHeader(paidResponse.headers, "payment-response"));
  const responseBody = await paidResponse.json();

  console.log("Paid retry verified.");
  console.log(JSON.stringify({
    endpoint: `${config.apiUrl}/retrieve`,
    paymentResponse,
    responseBody
  }, null, 2));
};

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void runNeverminedSmokeVerification(process.env).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
