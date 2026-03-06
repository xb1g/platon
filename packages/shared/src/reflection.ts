import { z } from "zod";

export const learningSchema = z.object({
  title: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const provenanceSchema = z.object({
  sessionId: z.string().min(1),
  generatedBy: z.string().min(1)
});

export const memoryStatusSchema = z.enum([
  "candidate",
  "published",
  "suppressed",
  "quarantined"
]);

export const memoryProvenanceSchema = z.object({
  rawSessionId: z.string().min(1),
  reflectionVersion: z.string().min(1),
  sourceSessionIds: z.array(z.string().min(1)).min(1)
});

export const publishedMemorySchema = learningSchema.extend({
  id: z.string().min(1),
  kind: z.enum(["learning", "session", "failure", "success_pattern"]),
  content: z.string().min(1),
  qualityScore: z.number().min(0).max(1),
  status: memoryStatusSchema,
  suppressionReason: z.string().min(1).optional(),
  provenance: memoryProvenanceSchema
});

export const reflectionSchema = z.object({
  sessionId: z.string().min(1),
  wentWell: z.array(z.string().min(1)),
  wentWrong: z.array(z.string().min(1)),
  likelyCauses: z.array(z.string().min(1)).default([]),
  reusableTactics: z.array(z.string().min(1)).default([]),
  learnings: z.array(learningSchema),
  confidence: z.number().min(0).max(1),
  provenance: provenanceSchema
});

export type Learning = z.infer<typeof learningSchema>;
export type MemoryProvenance = z.infer<typeof memoryProvenanceSchema>;
export type MemoryStatus = z.infer<typeof memoryStatusSchema>;
export type PublishedMemory = z.infer<typeof publishedMemorySchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
export type Reflection = z.infer<typeof reflectionSchema>;

export const parseReflection = (input: unknown): Reflection =>
  reflectionSchema.parse(input);
