export type NeverminedEnvironment = "sandbox" | "live";

export type NeverminedConfig = {
  agentId: string;
  apiKey: string;
  environment: NeverminedEnvironment;
  planId: string;
};

export type NeverminedDiagnosticsResponse = {
  configured: boolean;
  environment: NeverminedEnvironment | null;
  agentId: string | null;
  planId: string | null;
  tokenAcquisition: {
    sdkPackage: "@nevermined-io/payments";
    recommendedMethod: "payments.x402.getX402AccessToken";
    minimumVersion: "1.1.6";
    deprecatedMethods: ["payments.agents.getAgentAccessToken"];
  };
  transport: {
    apiHeader: "payment-signature";
    mcpHeader: "Authorization: Bearer <x402-access-token>";
  };
  docs: {
    integrationPath: "/agent-installation.md";
    openApiPath: "/openapi.json";
  };
};

export const loadNeverminedConfig = (
  env: Partial<Record<string, string | undefined>> = process.env
): NeverminedConfig | null => {
  const apiKey = env.NVM_API_KEY;
  const planId = env.NVM_PLAN_ID;
  const agentId = env.NVM_AGENT_ID;

  if (!apiKey || !planId || !agentId) {
    return null;
  }

  return {
    apiKey,
    agentId,
    environment: env.NVM_ENVIRONMENT === "live" ? "live" : "sandbox",
    planId,
  };
};

export const buildNeverminedDiagnostics = (
  config: NeverminedConfig | null
): NeverminedDiagnosticsResponse => ({
  configured: Boolean(config),
  environment: config?.environment ?? null,
  agentId: config?.agentId ?? null,
  planId: config?.planId ?? null,
  tokenAcquisition: {
    sdkPackage: "@nevermined-io/payments",
    recommendedMethod: "payments.x402.getX402AccessToken",
    minimumVersion: "1.1.6",
    deprecatedMethods: ["payments.agents.getAgentAccessToken"],
  },
  transport: {
    apiHeader: "payment-signature",
    mcpHeader: "Authorization: Bearer <x402-access-token>",
  },
  docs: {
    integrationPath: "/agent-installation.md",
    openApiPath: "/openapi.json",
  },
});
