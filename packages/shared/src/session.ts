import { z } from "zod";

export const taskSchema = z.object({
  kind: z.string().min(1),
  summary: z.string().min(1)
});

export const toolSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1)
});

export const eventSchema = z.object({
  type: z.string().min(1),
  summary: z.string().min(1)
});

export const artifactSchema = z.object({
  kind: z.string().min(1),
  uri: z.string().min(1),
  summary: z.string().min(1).optional()
});

export const sessionErrorSchema = z.object({
  message: z.string().min(1),
  code: z.string().min(1).optional(),
  retryable: z.boolean().default(false)
});

export const humanFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  summary: z.string().min(1)
});

export const outcomeSchema = z.object({
  status: z.enum(["success", "failed", "partial"]),
  summary: z.string().min(1)
});

export const sessionPayloadSchema = z.object({
  tenantId: z.string().min(1),
  agentId: z.string().min(1),
  sessionId: z.string().min(1),
  inputContextSummary: z.string().min(1).optional(),
  task: taskSchema,
  outcome: outcomeSchema,
  tools: z.array(toolSchema).default([]),
  events: z.array(eventSchema).default([]),
  artifacts: z.array(artifactSchema).default([]),
  errors: z.array(sessionErrorSchema).default([]),
  humanFeedback: humanFeedbackSchema.optional()
});

export type Artifact = z.infer<typeof artifactSchema>;
export type HumanFeedback = z.infer<typeof humanFeedbackSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
export type SessionError = z.infer<typeof sessionErrorSchema>;
export type SessionEvent = z.infer<typeof eventSchema>;
export type SessionPayload = z.infer<typeof sessionPayloadSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Tool = z.infer<typeof toolSchema>;

export const parseSessionPayload = (input: unknown): SessionPayload =>
  sessionPayloadSchema.parse(input);
