import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

export const authPlugin: FastifyPluginAsync = fp(async (server) => {
  server.decorateRequest('tenantId', null);

  server.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    // Mock token validation
    if (token === 'invalid') {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    request.tenantId = 'tenant-1';
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string | null;
  }
}
