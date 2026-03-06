import { Payments } from "@nevermined-io/payments";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url))
});

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const registerEnvSchema = z.object({
  NVM_API_KEY: z.string().min(1),
  NVM_ENVIRONMENT: z.enum(["sandbox", "live"]).default("sandbox"),
  BUILDER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "BUILDER_ADDRESS must be a valid EVM address"),
  API_PUBLIC_URL: z.string().url().default("http://localhost:3001"),
  NVM_AGENT_NAME: z.string().min(1).default("Platon Memory API"),
  NVM_PLAN_NAME: z.string().min(1).default("Platon Memory Credits")
});

type HexAddress = `0x${string}`;

type RegisterNeverminedConfig = {
  apiKey: string;
  environment: "sandbox" | "live";
  builderAddress: HexAddress;
  publicUrl: string;
  agentName: string;
  planName: string;
};

export const validateRegisterNeverminedEnv = (
  env: Partial<Record<string, string | undefined>>
): RegisterNeverminedConfig => {
  const missing = ["NVM_API_KEY", "BUILDER_ADDRESS"].filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  const parsed = registerEnvSchema.parse(env);

  return {
    apiKey: parsed.NVM_API_KEY,
    environment: parsed.NVM_ENVIRONMENT,
    builderAddress: parsed.BUILDER_ADDRESS as HexAddress,
    publicUrl: parsed.API_PUBLIC_URL,
    agentName: parsed.NVM_AGENT_NAME,
    planName: parsed.NVM_PLAN_NAME
  };
};

const buildApiRegistration = (config: RegisterNeverminedConfig) => ({
  agentApi: {
    endpoints: [
      {
        method: "POST",
        path: "/sessions",
        url: `${config.publicUrl.replace(/\/$/, "")}/sessions`
      },
      {
        method: "POST",
        path: "/retrieve",
        url: `${config.publicUrl.replace(/\/$/, "")}/retrieve`
      }
    ]
  },
  agentMetadata: {
    name: config.agentName,
    description: "Paid API surface for writing and retrieving graph-backed agent memory.",
    tags: ["memory", "x402", "api"],
    dateCreated: new Date()
  },
  creditsConfig: {
    amountOfCredits: 1_000n,
    minCreditsToCharge: 1n
  },
  planMetadata: {
    name: config.planName,
    description: "Credit plan for the Platon memory API x402 endpoints.",
    dateCreated: new Date()
  },
  price: 1n
});

export const registerNeverminedAgent = async (env: Partial<Record<string, string | undefined>>) => {
  const config = validateRegisterNeverminedEnv(env);
  const registration = buildApiRegistration(config);

  const payments = Payments.getInstance({
    environment: config.environment,
    nvmApiKey: config.apiKey
  });

  const { agentId, planId } = await payments.agents.registerAgentAndPlan(
    registration.agentMetadata,
    registration.agentApi,
    registration.planMetadata,
    payments.plans.getERC20PriceConfig(registration.price, USDC_BASE_SEPOLIA, config.builderAddress),
    payments.plans.getFixedCreditsConfig(
      registration.creditsConfig.amountOfCredits,
      registration.creditsConfig.minCreditsToCharge
    )
  );

  return {
    agentId,
    planId
  };
};

const main = async () => {
  const { agentId, planId } = await registerNeverminedAgent(process.env);

  console.log("Nevermined registration complete.");
  console.log(`NVM_AGENT_ID=${agentId}`);
  console.log(`NVM_PLAN_ID=${planId}`);
};

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
