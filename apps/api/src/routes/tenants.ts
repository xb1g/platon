import { FastifyPluginAsync } from 'fastify';

export const tenantRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async (request, reply) => {
    return reply.status(200).send({ tenantId: request.tenantId });
  });
};
