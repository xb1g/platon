import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sessionSchema } from '@memory/shared';

export const sessionRoutes: FastifyPluginAsync = async (server) => {
  server.post('/', async (request, reply) => {
    try {
      const data = sessionSchema.parse(request.body);
      // TODO: Save to Postgres and enqueue job
      // Use request.tenantId for tenant isolation
      return reply.status(201).send({ id: 'mock-id', status: 'queued', tenantId: request.tenantId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid payload', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};
