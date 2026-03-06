import type { SessionPayload } from "@memory/shared";

export const MAX_SESSION_PAYLOAD_BYTES = 32 * 1024;

const SECRET_PATTERNS: RegExp[] = [
  /\b(sk|rk)-[A-Za-z0-9_\-]+\b/g,
  /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi,
  /\bBearer\s+[A-Za-z0-9._\-+/=]+\b/g,
  /\bpostgres(?:ql)?:\/\/[^\s]+/gi
];

export const redactSecrets = (value: string): string => {
  let redacted = value;

  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }

  return redacted;
};

export const payloadByteSize = (payload: unknown): number =>
  Buffer.byteLength(JSON.stringify(payload), "utf8");

export const isPayloadTooLarge = (
  payload: unknown,
  maxBytes = MAX_SESSION_PAYLOAD_BYTES
): boolean => payloadByteSize(payload) > maxBytes;

export const redactSessionPayload = (payload: SessionPayload): SessionPayload => ({
  ...payload,
  inputContextSummary:
    payload.inputContextSummary == null ? undefined : redactSecrets(payload.inputContextSummary),
  task: {
    ...payload.task,
    summary: redactSecrets(payload.task.summary)
  },
  outcome: {
    ...payload.outcome,
    summary: redactSecrets(payload.outcome.summary)
  },
  tools: payload.tools.map((tool) => ({
    ...tool,
    name: redactSecrets(tool.name),
    category: redactSecrets(tool.category)
  })),
  events: payload.events.map((event) => ({
    ...event,
    summary: redactSecrets(event.summary)
  })),
  artifacts: payload.artifacts.map((artifact) => ({
    ...artifact,
    kind: redactSecrets(artifact.kind),
    uri: redactSecrets(artifact.uri),
    summary: artifact.summary == null ? undefined : redactSecrets(artifact.summary)
  })),
  errors: payload.errors.map((error) => ({
    ...error,
    message: redactSecrets(error.message)
  })),
  humanFeedback:
    payload.humanFeedback == null
      ? undefined
      : {
          ...payload.humanFeedback,
          summary: redactSecrets(payload.humanFeedback.summary)
        }
});
