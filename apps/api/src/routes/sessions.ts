import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sessionPayloadSchema } from "@memory/shared";
import { enqueueReflectionJob } from "../lib/reflection-queue.js";
import { ensureSessionTable, insertRawSession, markReflectionQueued } from "../lib/session-store.js";
import { detectSuspiciousSessionPayload } from "../lib/security/detect-suspicious-memory.js";
import { isPayloadTooLarge, redactSessionPayload } from "../lib/security/redact.js";
import { ensureAgentIdentityMatches, getVerifiedAuthContext } from "../lib/verified-auth.js";

export const sessionRoutes: FastifyPluginAsync = async (server) => {
  server.post("/", async (request, reply) => {
    try {
      const data = sessionPayloadSchema.parse(request.body);
      const authContext = getVerifiedAuthContext(request, reply);

      if (!authContext) {
        return reply;
      }

      if (!ensureAgentIdentityMatches(data, authContext, reply)) {
        return reply;
      }

      if (isPayloadTooLarge(data)) {
        return reply.status(413).send({ error: "Payload too large" });
      }

      const sanitizedPayload = redactSessionPayload(data);
      const suspiciousDetection = detectSuspiciousSessionPayload(sanitizedPayload);

      if (suspiciousDetection) {
        return reply.status(422).send({
          error: "Suspicious payload",
          status: "quarantined",
          reason: suspiciousDetection.reason
        });
      }

      await ensureSessionTable();

      const storedSession = await insertRawSession({
        subscriberId: authContext.subscriberId,
        agentKind: authContext.agentKind,
        agentId: authContext.agentId,
        sessionId: sanitizedPayload.sessionId,
        payload: sanitizedPayload
      });

      await enqueueReflectionJob({
        rawSessionId: storedSession.id,
        subscriberId: authContext.subscriberId,
        agentId: authContext.agentId,
        agentKind: authContext.agentKind
      });

      await markReflectionQueued(storedSession.id);

      return reply.status(201).send({
        id: storedSession.id,
        status: storedSession.reflection_status ?? "queued",
        subscriberId: authContext.subscriberId,
        agentId: authContext.agentId,
        agentKind: authContext.agentKind
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Invalid payload", details: error.errors });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
};
