import { FastifyPluginAsync } from 'fastify';

export const auditRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async (request, reply) => {
    return reply.status(200).send({ events: [] });
  });
};
