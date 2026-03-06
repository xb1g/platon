import { Payments } from "@nevermined-io/payments";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

async function main() {
    let specPath = join(process.cwd(), "agent-spec.json");
    if (!existsSync(specPath)) {
        specPath = join(process.cwd(), "../../agent-spec.json");
    }

    if (!existsSync(specPath)) {
        console.error("Could not find agent-spec.json in current directory or root.");
        process.exit(1);
    }

    const spec = JSON.parse(readFileSync(specPath, "utf8"));

    if (!process.env.NVM_API_KEY) {
        console.error("Missing NVM_API_KEY in .env");
        process.exit(1);
    }

    if (!process.env.BUILDER_ADDRESS) {
        console.error("Missing BUILDER_ADDRESS in .env. This should be your wallet address.");
        process.exit(1);
    }

    const payments = Payments.getInstance({
        nvmApiKey: process.env.NVM_API_KEY,
        environment: (process.env.NVM_ENVIRONMENT as any) || "sandbox",
    });

    console.log("Registering Agent and Plan...");
    console.log(`Using Builder Wallet: ${process.env.BUILDER_ADDRESS}`);

    try {
        const { agentId, planId } = await payments.agents.registerAgentAndPlan(
            {
                name: spec.agent.name,
                description: spec.agent.description,
                tags: spec.agent.tags,
                dateCreated: new Date(),
            },
            {
                endpoints: spec.agent.endpoints,
            },
            {
                name: spec.plan.name,
                description: spec.plan.description,
                dateCreated: new Date(),
            },
            payments.plans.getERC20PriceConfig(
                BigInt(spec.plan.price),
                spec.plan.tokenAddress || USDC_ADDRESS,
                process.env.BUILDER_ADDRESS
            ),
            payments.plans.getFixedCreditsConfig(
                BigInt(spec.plan.amountOfCredits),
                BigInt(spec.plan.creditsConfig.minCreditsToCharge)
            )
        );

        console.log("\n✅ Successfully registered!");
        console.log(`Agent ID: ${agentId}`);
        console.log(`Plan ID:  ${planId}`);
        console.log("\nUpdate your .env file with these values.");
    } catch (error) {
        console.error("\n❌ Registration failed:");
        console.error(error);
    }
}

main().catch(console.error);
