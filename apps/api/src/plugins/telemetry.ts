import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

export const telemetryPlugin: FastifyPluginAsync = fp(async (server) => {
  server.addHook('onRequest', async (request, reply) => {
    request.log.info({ req: request }, 'incoming request');
  });

  server.addHook('onResponse', async (request, reply) => {
    request.log.info({ res: reply }, 'request completed');
  });
});
