import { FastifyPluginAsync } from 'fastify';

export const billingRoutes: FastifyPluginAsync = async (server) => {
  server.get('/credits', async (request, reply) => {
    return reply.status(200).send({ credits: 100 });
  });
};
