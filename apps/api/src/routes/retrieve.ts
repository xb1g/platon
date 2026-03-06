import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { retrievalRequestSchema } from '@memory/shared';
import { resolveNamespace } from '../lib/memory-namespace.js';
import { getSession } from '../lib/neo4j.js';
import { graphSearch } from '../lib/retrieval/graph-search.js';
import { vectorSearch } from '../lib/retrieval/vector-search.js';
import { rankResults } from '../lib/retrieval/rank.js';

const getSubscriberId = (request: {
  headers: Record<string, unknown>;
  tenantId?: string | null;
}) => {
  const header = request.headers['x-platon-subscriber-id'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }

  return request.tenantId ?? 'local-dev';
};

export const retrieveRoutes: FastifyPluginAsync = async (server) => {
  server.post('/', async (request, reply) => {
    const session = getSession();

    try {
      const data = retrievalRequestSchema.parse(request.body);
      const subscriberId = getSubscriberId(request);

      const namespace = resolveNamespace({
        subscriberId,
        agentKind: data.agentKind,
        agentId: data.agentId,
      });

      const graphResults = await graphSearch(
        {
          namespaceId: namespace.namespaceId,
          query: data.query,
          limit: data.limit,
          filters: data.filters,
        },
        { session }
      );
      const vectorResults = await vectorSearch(data.query);
      const rankedResults = rankResults(graphResults, vectorResults);
      return reply.status(200).send({ results: rankedResults, subscriberId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid payload', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    } finally {
      await session.close();
    }
  });
};
