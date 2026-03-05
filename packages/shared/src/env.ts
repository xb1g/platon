import { config } from "dotenv";
import { z } from "zod";

config();

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT_API: z.string().min(1).default("3001"),
  PORT_MCP: z.string().min(1).default("3002"),
  PORT_WEB: z.string().min(1).default("3000"),
  POSTGRES_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  NEO4J_URI: z.string().min(1),
  NEO4J_USERNAME: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1)
});

export type AppEnv = z.infer<typeof envSchema>;

export const loadEnv = (input: NodeJS.ProcessEnv = process.env): AppEnv =>
  envSchema.parse({
    NODE_ENV: input.NODE_ENV,
    PORT_API: input.PORT_API,
    PORT_MCP: input.PORT_MCP,
    PORT_WEB: input.PORT_WEB,
    POSTGRES_URL: input.POSTGRES_URL,
    REDIS_URL: input.REDIS_URL,
    NEO4J_URI: input.NEO4J_URI,
    NEO4J_USERNAME: input.NEO4J_USERNAME,
    NEO4J_PASSWORD: input.NEO4J_PASSWORD
  });
