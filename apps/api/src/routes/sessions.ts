import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sessionPayloadSchema } from "@memory/shared";
import { ensureSessionTable, insertRawSession } from "../lib/session-store.js";
import { ensureAgentIdentityMatches, getVerifiedAuthContext } from "../lib/verified-auth.js";

export const sessionRoutes: FastifyPluginAsync = async (server) => {
  server.post("/", async (request, reply) => {
    try {
      const data = sessionPayloadSchema.parse(request.body);
      const authContext = getVerifiedAuthContext(request, reply);

      if (!authContext) {
        return reply;
      }

      if (!ensureAgentIdentityMatches(data, authContext, reply)) {
        return reply;
      }

      await ensureSessionTable();
      const storedSession = await insertRawSession({
        subscriberId: authContext.subscriberId,
        agentKind: authContext.agentKind,
        agentId: authContext.agentId,
        sessionId: data.sessionId,
        payload: data
      });

      return reply.status(201).send({
        id: storedSession.id,
        status: storedSession.reflection_status ?? "queued",
        subscriberId: authContext.subscriberId,
        agentId: authContext.agentId,
        agentKind: authContext.agentKind
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Invalid payload", details: error.errors });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
};
