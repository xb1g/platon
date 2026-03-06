import { Payments } from "@nevermined-io/payments";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { NeverminedDiagnosticsResponse } from "../lib/nevermined.js";

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

type SmokePaymentsClient = {
  x402: {
    getX402AccessToken(planId: string, agentId: string): Promise<{ accessToken: string }>;
  };
};

type SmokeVerificationDeps = {
  createPayments?: (config: {
    nvmApiKey: string;
    environment: "sandbox" | "live";
  }) => SmokePaymentsClient;
  fetchFn?: typeof fetch;
  logger?: Pick<typeof console, "log">;
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

export const assertNeverminedDiagnostics = (
  diagnostics: NeverminedDiagnosticsResponse,
  config: SmokeVerificationConfig
) => {
  if (!diagnostics.configured) {
    throw new Error("Platon backend misconfiguration: /nevermined.json reports Nevermined is not configured");
  }

  if (diagnostics.environment !== config.environment) {
    throw new Error(
      `Platon backend misconfiguration: expected environment ${config.environment}, got ${diagnostics.environment}`
    );
  }

  if (diagnostics.planId !== config.planId) {
    throw new Error(
      `Platon backend misconfiguration: expected planId ${config.planId}, got ${diagnostics.planId}`
    );
  }

  if (diagnostics.agentId !== config.agentId) {
    throw new Error(
      `Platon backend misconfiguration: expected agentId ${config.agentId}, got ${diagnostics.agentId}`
    );
  }
};

export const runNeverminedSmokeVerification = async (
  env: Partial<Record<string, string | undefined>>,
  deps: SmokeVerificationDeps = {}
) => {
  const config = parseSmokeVerificationEnv(env);
  const fetchFn = deps.fetchFn ?? fetch;
  const logger = deps.logger ?? console;
  const createPayments = deps.createPayments ?? ((paymentConfig) =>
    Payments.getInstance(paymentConfig) as unknown as SmokePaymentsClient);
  const payload = buildSmokeRetrievePayload();

  const diagnosticsResponse = await fetchFn(`${config.apiUrl}/nevermined.json`, {
    method: "GET"
  });

  if (!diagnosticsResponse.ok) {
    const body = await diagnosticsResponse.text();
    throw new Error(
      `Platon backend misconfiguration: GET /nevermined.json returned ${diagnosticsResponse.status}: ${body}`
    );
  }

  const diagnostics = (await diagnosticsResponse.json()) as NeverminedDiagnosticsResponse;
  assertNeverminedDiagnostics(diagnostics, config);

  logger.log("Nevermined backend diagnostics verified.");
  logger.log(
    JSON.stringify(
      {
        endpoint: `${config.apiUrl}/nevermined.json`,
        diagnostics
      },
      null,
      2
    )
  );

  const preflightResponse = await fetchFn(`${config.apiUrl}/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (preflightResponse.status !== 402) {
    const body = await preflightResponse.text();
    throw new Error(
      `Platon backend paywall preflight failed: expected 402 from /retrieve, got ${preflightResponse.status}: ${body}`
    );
  }

  const paymentRequired = decodeBase64Json(readHeader(preflightResponse.headers, "payment-required"));

  logger.log("402 preflight verified.");
  logger.log(
    JSON.stringify(
      {
        endpoint: `${config.apiUrl}/retrieve`,
        paymentRequired
      },
      null,
      2
    )
  );

  if (!config.hasSubscriberApiKey || !config.subscriberApiKey) {
    logger.log(
      "Backend diagnostics and 402 preflight verified. Paid retry skipped. Set NVM_SUBSCRIBER_API_KEY to run the full Nevermined sandbox flow."
    );
    return;
  }

  const subscriberPayments = createPayments({
    nvmApiKey: config.subscriberApiKey,
    environment: config.environment
  });

  let accessToken: string;
  try {
    ({ accessToken } = await subscriberPayments.x402.getX402AccessToken(
      config.planId,
      config.agentId
    ));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Nevermined token acquisition failed: ${message}`);
  }

  const paidResponse = await fetchFn(`${config.apiUrl}/retrieve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "payment-signature": accessToken
    },
    body: JSON.stringify(payload)
  });

  if (!paidResponse.ok) {
    const body = await paidResponse.text();
    throw new Error(
      `Paid retry failed after successful token acquisition with ${paidResponse.status}: ${body}`
    );
  }

  const paymentResponse = decodeBase64Json(readHeader(paidResponse.headers, "payment-response"));
  const responseBody = await paidResponse.json();

  logger.log("Paid retry verified.");
  logger.log(
    JSON.stringify(
      {
        endpoint: `${config.apiUrl}/retrieve`,
        paymentResponse,
        responseBody
      },
      null,
      2
    )
  );
};

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void runNeverminedSmokeVerification(process.env).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
