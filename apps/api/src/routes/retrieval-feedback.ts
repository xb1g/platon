import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { parseRetrievalFeedbackRequest } from "@memory/shared";
import { resolveNamespace } from "../lib/memory-namespace.js";
import { getSession } from "../lib/neo4j.js";
import { recordRetrievalFeedback } from "../lib/retrieval/feedback-store.js";
import { memoryExistsInNamespace } from "../lib/retrieval/memory-exists.js";
import { ensureAgentIdentityMatches, getVerifiedAuthContext } from "../lib/verified-auth.js";

export const retrievalFeedbackRoutes: FastifyPluginAsync = async (server) => {
  server.post("/", async (request, reply) => {
    try {
      const data = parseRetrievalFeedbackRequest(request.body);
      const authContext = getVerifiedAuthContext(request, reply);

      if (!authContext) {
        return reply;
      }

      if (!ensureAgentIdentityMatches(data, authContext, reply)) {
        return reply;
      }

      const session = getSession();
      try {
        const namespace = resolveNamespace({
          subscriberId: authContext.subscriberId,
          agentKind: authContext.agentKind,
          agentId: authContext.agentId
        });
        const exists = await memoryExistsInNamespace(
          {
            namespaceId: namespace.namespaceId,
            memoryId: data.memoryId
          },
          { session }
        );

        if (!exists) {
          return reply.status(404).send({ error: "Memory not found" });
        }

        const usefulness = await recordRetrievalFeedback({
          subscriberId: authContext.subscriberId,
          agentId: authContext.agentId,
          agentKind: authContext.agentKind,
          memoryId: data.memoryId,
          query: data.query,
          verdict: data.verdict
        });

        return reply.status(200).send({
          status: "recorded",
          memoryId: data.memoryId,
          verdict: data.verdict,
          usefulness
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Invalid payload", details: error.errors });
      }

      return reply.status(500).send({ error: "Internal server error" });
    }
  });
};
