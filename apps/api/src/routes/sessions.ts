import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sessionPayloadSchema } from '@memory/shared';

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

export const sessionRoutes: FastifyPluginAsync = async (server) => {
  server.post('/', async (request, reply) => {
    try {
      const data = sessionPayloadSchema.parse(request.body);
      const subscriberId = getSubscriberId(request);
      // TODO: Save to Postgres and enqueue job
      return reply.status(201).send({ id: 'mock-id', status: 'queued', subscriberId, agentId: data.agentId, agentKind: data.agentKind });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid payload', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};
