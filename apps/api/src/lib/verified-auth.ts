import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthContext } from "../plugins/auth.js";

type AgentScopedPayload = {
  agentId: string;
  agentKind: string;
};

export const getVerifiedAuthContext = (
  request: FastifyRequest,
  reply: FastifyReply
): AuthContext | null => {
  if (!request.authContext) {
    void reply.status(401).send({ error: "Unauthorized" });
    return null;
  }

  return request.authContext;
};

export const ensureAgentIdentityMatches = (
  payload: AgentScopedPayload,
  authContext: AuthContext,
  reply: FastifyReply
): boolean => {
  if (payload.agentId === authContext.agentId && payload.agentKind === authContext.agentKind) {
    return true;
  }

  void reply.status(403).send({
    error: "Forbidden",
    message: "Payload agent identity does not match verified auth context"
  });

  return false;
};
