import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { retrievalRequestSchema } from '@memory/shared';
import { graphSearch } from '../lib/retrieval/graph-search.js';
import { vectorSearch } from '../lib/retrieval/vector-search.js';
import { rankResults } from '../lib/retrieval/rank.js';

export const retrieveRoutes: FastifyPluginAsync = async (server) => {
  server.post('/', async (request, reply) => {
    try {
      const data = retrievalRequestSchema.parse(request.body);
      const graphResults = await graphSearch(data.query);
      const vectorResults = await vectorSearch(data.query);
      const rankedResults = rankResults(graphResults, vectorResults);
      return reply.status(200).send({ results: rankedResults });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid payload', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};
