import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

export const paywallPlugin: FastifyPluginAsync = fp(async (server) => {
  server.addHook('preHandler', async (request, reply) => {
    // Mock Nevermined check
    const hasCredits = true;
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Payment Required' });
    }
  });
});
