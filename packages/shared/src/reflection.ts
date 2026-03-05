import { z } from "zod";

export const learningSchema = z.object({
  title: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const provenanceSchema = z.object({
  sessionId: z.string().min(1),
  generatedBy: z.string().min(1)
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
export type Provenance = z.infer<typeof provenanceSchema>;
export type Reflection = z.infer<typeof reflectionSchema>;

export const parseReflection = (input: unknown): Reflection =>
  reflectionSchema.parse(input);
