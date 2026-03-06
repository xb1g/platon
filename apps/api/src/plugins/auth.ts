import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { PaymentAuthContext } from "./paywall.js";

export type AuthContext = PaymentAuthContext;

export type AuthPluginOptions = {
  protectedRoutes?: Record<string, boolean>;
};

const defaultProtectedRoutes: Record<string, boolean> = {
  "POST /retrieve": true,
  "POST /sessions": true
};

const getRouteKey = (request: FastifyRequest) => {
  const url = request.url.split("?")[0] ?? request.url;
  return `${request.method.toUpperCase()} ${url}`;
};

const normalizeAuthContext = (authContext: PaymentAuthContext): AuthContext => ({
  subscriberId: authContext.subscriberId,
  agentId: authContext.agentId,
  agentKind: authContext.agentKind,
  planId: authContext.planId
});

export const authPlugin = fp<AuthPluginOptions>(async (server, options) => {
  const protectedRoutes = options.protectedRoutes ?? defaultProtectedRoutes;

  server.decorateRequest("authContext", null);

  server.addHook("preHandler", async (request, reply) => {
    if (!protectedRoutes[getRouteKey(request)]) {
      return;
    }

    const authContext = request.paymentContext?.authContext;

    if (!authContext) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    request.authContext = normalizeAuthContext(authContext);
  });
});

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext | null;
  }
}
