import cors from "@fastify/cors";
import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import { buildNeverminedDiagnostics, loadNeverminedConfig } from "./lib/nevermined.js";
import { authPlugin } from "./plugins/auth.js";
import { paywallPlugin, type PaywallPluginOptions } from "./plugins/paywall.js";
import { retrieveRoutes } from "./routes/retrieve.js";
import { sessionRoutes } from "./routes/sessions.js";

export const buildServer = async (options: { paywall?: PaywallPluginOptions } = {}) => {
  const server = Fastify({
    logger: true
  });
  const neverminedConfig = options.paywall?.config ?? loadNeverminedConfig();

  await server.register(cors, {
    origin: "*"
  });

  await server.register(paywallPlugin, options.paywall ?? {});
  await server.register(authPlugin);
  await server.register(sessionRoutes, { prefix: "/sessions" });
  await server.register(retrieveRoutes, { prefix: "/retrieve" });

  server.get("/nevermined.json", async () => {
    return buildNeverminedDiagnostics(neverminedConfig);
  });

  server.get("/openapi.json", async () => {
    return {
      openapi: "3.1.0",
      info: {
        title: "Platon Memory API",
        version: "0.1.0",
        description: "Paid session ingestion and retrieval API for graph-backed agent memory."
      },
      paths: {
        "/sessions": {
          post: {
            operationId: "dumpSession",
            summary: "Store a session for later reflection",
            requestBody: {
              required: true
            },
            responses: {
              "201": { description: "Session accepted" },
              "402": { description: "Payment required" }
            }
          }
        },
        "/retrieve": {
          post: {
            operationId: "retrieveContext",
            summary: "Retrieve relevant memory context",
            requestBody: {
              required: true
            },
            responses: {
              "200": { description: "Relevant context returned" },
              "402": { description: "Payment required" }
            }
          }
        },
        "/nevermined.json": {
          get: {
            operationId: "neverminedDiagnostics",
            summary: "Inspect Nevermined runtime configuration and token guidance",
            responses: {
              "200": { description: "Nevermined diagnostics returned" }
            }
          }
        }
      }
    };
  });

  server.get("/health", async () => {
    return { status: "ok" };
  });

  return server;
};

const start = async () => {
  const server = await buildServer();
  const port = Number(process.env.PORT ?? "3001");

  try {
    await server.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void start();
}
