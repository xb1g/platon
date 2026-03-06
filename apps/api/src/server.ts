import cors from "@fastify/cors";
import Fastify from "fastify";
import { fileURLToPath } from "node:url";
import { paywallPlugin, type PaywallPluginOptions } from "./plugins/paywall.js";
import { retrieveRoutes } from "./routes/retrieve.js";
import { sessionRoutes } from "./routes/sessions.js";

export const buildServer = async (options: { paywall?: PaywallPluginOptions } = {}) => {
  const server = Fastify({
    logger: true
  });

  await server.register(cors, {
    origin: "*"
  });

  await server.register(paywallPlugin, options.paywall ?? {});
  await server.register(sessionRoutes, { prefix: "/sessions" });
  await server.register(retrieveRoutes, { prefix: "/retrieve" });

  server.get("/health", async () => {
    return { status: "ok" };
  });

  return server;
};

const start = async () => {
  const server = await buildServer();

  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void start();
}
