import type { StoredSessionPayload } from './session-store.js';

const SECRET_PATTERNS: RegExp[] = [
  /\b(sk|rk)-[A-Za-z0-9_\-]+\b/g,
  /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi,
  /\bBearer\s+[A-Za-z0-9._\-+/=]+\b/g,
  /\bpostgres(?:ql)?:\/\/[^\s]+/gi,
];

const redactSecrets = (value: string): string => {
  let redacted = value;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
};

const sanitizeArray = <T>(items: T[] | undefined, project: (item: T) => unknown): unknown[] =>
  (items ?? []).map(project);

export const createReflectionPrompt = (session: StoredSessionPayload): string => {
  const safeSession = {
    sessionId: session.sessionId,
    agentId: session.agentId,
    agentKind: session.agentKind,
    tenantId: session.tenantId,
    inputContextSummary:
      session.inputContextSummary == null ? undefined : redactSecrets(session.inputContextSummary),
    task: {
      kind: session.task.kind,
      summary: redactSecrets(session.task.summary),
    },
    outcome: {
      status: session.outcome.status,
      summary: redactSecrets(session.outcome.summary),
    },
    errors: sanitizeArray(session.errors, (error) => ({
      message: redactSecrets(error.message),
      code: error.code,
      retryable: error.retryable ?? false,
    })),
    events: sanitizeArray(session.events, (event) => ({
      type: event.type,
      summary: redactSecrets(event.summary),
    })),
    tools: sanitizeArray(session.tools, (tool) => ({
      name: redactSecrets(tool.name),
      category: redactSecrets(tool.category),
    })),
    artifacts: sanitizeArray(session.artifacts, (artifact) => ({
      kind: redactSecrets(artifact.kind),
      uri: redactSecrets(artifact.uri),
      summary: artifact.summary == null ? undefined : redactSecrets(artifact.summary),
    })),
    humanFeedback:
      session.humanFeedback == null
        ? undefined
        : {
            rating: session.humanFeedback.rating,
            summary: redactSecrets(session.humanFeedback.summary),
          },
  };

  return [
    'You are generating a strict JSON reflection for an autonomous agent memory system.',
    'Return JSON only. Do not wrap the response in Markdown or prose.',
    'The JSON object must contain exactly these keys: wentWell, wentWrong, likelyCauses, reusableTactics, learnings, confidence.',
    'Requirements:',
    '- wentWell, wentWrong, likelyCauses, reusableTactics are arrays of concise non-empty strings.',
    '- learnings is a non-empty array of objects with title and confidence between 0 and 1.',
    '- confidence is a number between 0 and 1 representing overall trust in this reflection.',
    '- Be specific, evidence-based, and grounded only in the session content below.',
    '- If the session failed, prioritize concrete failure patterns and reusable mitigations.',
    '',
    'Session:',
    JSON.stringify(safeSession, null, 2),
  ].join('\n');
};
