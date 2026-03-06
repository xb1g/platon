import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Payments } from "@nevermined-io/payments";

type NeverminedEnvironment = "sandbox" | "live";

type NeverminedConfig = {
  agentId: string;
  apiKey: string;
  environment: NeverminedEnvironment;
  planId: string;
};

type PaymentsClient = {
  requests: {
    redeemCreditsFromRequest(agentRequestId: string, requestAccessToken: string, creditsToBurn: bigint): Promise<unknown>;
    startProcessingRequest(
      agentId: string,
      accessToken: string,
      urlRequested: string,
      httpMethodRequested: string
    ): Promise<{
      agentRequestId: string;
      agentId?: string;
      agentKind?: string;
      balance: {
        isSubscriber: boolean;
      };
      planId?: string;
      subscriberId?: string;
    }>;
  };
};

type ProtectedRouteConfig = {
  credits: bigint;
};

export type PaywallPluginOptions = {
  config?: NeverminedConfig;
  payments?: PaymentsClient;
  protectedRoutes?: Record<string, ProtectedRouteConfig>;
};

export type PaymentAuthContext = {
  subscriberId: string;
  agentId: string;
  agentKind: string;
  planId: string;
};

export type PaymentContext = {
  agentRequestId: string;
  authContext?: PaymentAuthContext;
  credits: bigint;
  paymentRequired: unknown;
  skipSettlement?: boolean;
  token: string;
};

declare module "fastify" {
  interface FastifyRequest {
    paymentContext?: PaymentContext;
  }
}

const defaultProtectedRoutes: Record<string, ProtectedRouteConfig> = {
  "POST /retrieve": { credits: 1n },
  "POST /sessions": { credits: 1n }
};

const getRouteKey = (request: FastifyRequest) => {
  const url = request.url.split("?")[0] ?? request.url;
  return `${request.method.toUpperCase()} ${url}`;
};

const getToken = (request: FastifyRequest) => {
  const value = request.headers["payment-signature"];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const getInternalAuthHeader = (request: FastifyRequest) => {
  const value = request.headers["x-platon-internal-auth"];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const isTrustedInternalRequest = (request: FastifyRequest) => {
  const expected = process.env.PLATON_INTERNAL_AUTH_TOKEN;
  if (!expected) {
    return false;
  }

  return getInternalAuthHeader(request) === expected;
};

const encodeHeaderValue = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64");

const buildPaymentRequired = (config: NeverminedConfig) => ({
  accepts: [
    {
      extra: {
        agentId: config.agentId
      },
      network: config.environment === "live" ? "eip155:8453" : "eip155:84532",
      planId: config.planId,
      scheme: "nvm:erc4337"
    }
  ],
  x402Version: 2
});

const buildRequestedUrl = (request: FastifyRequest) => {
  const host = request.headers.host ?? "localhost";
  const path = request.url.split("?")[0] ?? request.url;
  return `${request.protocol}://${host}${path}`;
};

const deriveAuthContext = (
  requestInfo: {
    agentId?: string;
    agentKind?: string;
    planId?: string;
    subscriberId?: string;
  },
  config: NeverminedConfig
): PaymentAuthContext | undefined => {
  if (!requestInfo.subscriberId || !requestInfo.agentKind) {
    return undefined;
  }

  return {
    subscriberId: requestInfo.subscriberId,
    agentId: requestInfo.agentId ?? config.agentId,
    agentKind: requestInfo.agentKind,
    planId: requestInfo.planId ?? config.planId
  };
};

const sendPaymentRequired = (
  reply: FastifyReply,
  paymentRequired: unknown,
  message = "Missing x402 access token"
) =>
  reply.status(402).header("payment-required", encodeHeaderValue(paymentRequired)).send({
    error: "Payment Required",
    message
  });

const loadNeverminedConfig = (): NeverminedConfig | null => {
  const apiKey = process.env.NVM_API_KEY;
  const planId = process.env.NVM_PLAN_ID;
  const agentId = process.env.NVM_AGENT_ID;

  if (!apiKey || !planId || !agentId) {
    return null;
  }

  return {
    apiKey,
    agentId,
    environment: process.env.NVM_ENVIRONMENT === "live" ? "live" : "sandbox",
    planId
  };
};

const createPaymentsClient = (config: NeverminedConfig): PaymentsClient =>
  Payments.getInstance({
    environment: config.environment,
    nvmApiKey: config.apiKey
  }) as PaymentsClient;

export const paywallPlugin = fp<PaywallPluginOptions>(async (server, options: PaywallPluginOptions) => {
  const config = options.config ?? loadNeverminedConfig();

  if (!config) {
    server.log.warn("Nevermined configuration missing. Paywall is DISABLED.");
    return;
  }

  const payments = options.payments ?? createPaymentsClient(config);
  const protectedRoutes = options.protectedRoutes ?? defaultProtectedRoutes;

  server.addHook("preHandler", async (request, reply) => {
    const routeKey = getRouteKey(request);
    const routeConfig = protectedRoutes[routeKey];

    if (!routeConfig) {
      return;
    }

    const paymentRequired = buildPaymentRequired(config);

    const token = getToken(request);

    if (!token) {
      return sendPaymentRequired(reply, paymentRequired);
    }

    try {
      const requestInfo = await payments.requests.startProcessingRequest(
        config.agentId,
        token,
        buildRequestedUrl(request),
        request.method
      );

      if (!requestInfo.balance.isSubscriber) {
        return sendPaymentRequired(reply, paymentRequired, "Insufficient credits");
      }

      request.paymentContext = {
        agentRequestId: requestInfo.agentRequestId,
        authContext: deriveAuthContext(requestInfo, config),
        credits: routeConfig.credits,
        paymentRequired,
        skipSettlement: isTrustedInternalRequest(request),
        token
      };
    } catch {
      return sendPaymentRequired(reply, paymentRequired, "Invalid x402 access token");
    }
  });

  server.addHook("onSend", async (request, reply, payload) => {
    if (!request.paymentContext || request.paymentContext.skipSettlement || reply.statusCode >= 400) {
      return payload;
    }

    const settlement = await payments.requests.redeemCreditsFromRequest(
      request.paymentContext.agentRequestId,
      request.paymentContext.token,
      request.paymentContext.credits
    );

    reply.header("payment-response", encodeHeaderValue(settlement));

    return payload;
  });
});
