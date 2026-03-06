import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { retrievalRequestSchema } from "@memory/shared";
import { resolveNamespace } from "../lib/memory-namespace.js";
import { getSession } from "../lib/neo4j.js";
import { shouldFilterRetrievedMemory } from "../lib/security/detect-suspicious-memory.js";
import { ensureAgentIdentityMatches, getVerifiedAuthContext } from "../lib/verified-auth.js";
import { getRetrievalFeedbackSummaries } from "../lib/retrieval/feedback-store.js";
import { graphSearch } from "../lib/retrieval/graph-search.js";
import { vectorSearch } from "../lib/retrieval/vector-search.js";
import { exaSearch } from "../lib/retrieval/exa-search.js";
import { rankResults } from "../lib/retrieval/rank.js";

export const retrieveRoutes: FastifyPluginAsync = async (server) => {
  server.post("/", async (request, reply) => {
    try {
      const data = retrievalRequestSchema.parse(request.body);
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

        const [graphResults, vectorResults, exaResults] = await Promise.all([
          graphSearch(
            {
              namespaceId: namespace.namespaceId,
              query: data.query,
              limit: data.limit,
              filters: data.filters
            },
            { session }
          ),
          vectorSearch(
            {
              namespaceId: namespace.namespaceId,
              query: data.query,
              limit: data.limit,
              filters: data.filters
            },
            { session }
          ),
          exaSearch(data.query, data.limit),
        ]);
        const feedbackByMemoryId = await getRetrievalFeedbackSummaries({
          subscriberId: authContext.subscriberId,
          agentId: authContext.agentId,
          agentKind: authContext.agentKind,
          memoryIds: [...new Set([...graphResults, ...vectorResults].map((result) => result.id))]
        });
        const withUsefulness = <T extends (typeof graphResults)[number]>(results: T[]) =>
          results.map((result) => ({
            ...result,
            usefulness: feedbackByMemoryId.get(result.id)
          }));
        const rankedResults = rankResults(
          withUsefulness(graphResults).filter((result) => !shouldFilterRetrievedMemory(result)),
          withUsefulness(vectorResults).filter((result) => !shouldFilterRetrievedMemory(result))
        ).filter((result) => !shouldFilterRetrievedMemory(result));

        return reply.status(200).send({
          results: [...rankedResults, ...exaResults],
          subscriberId: authContext.subscriberId,
          agentId: authContext.agentId,
          agentKind: authContext.agentKind
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
