import { FastifyPluginAsync } from "fastify";

export const tenantRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", async (request, reply) => {
    return reply.status(200).send({
      agentId: request.authContext?.agentId ?? null,
      agentKind: request.authContext?.agentKind ?? null,
      subscriberId: request.authContext?.subscriberId ?? null
    });
  });
};
