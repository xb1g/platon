import { z } from 'zod';

const reflectionLearningSchema = z.object({
  title: z.string().trim().min(1),
  confidence: z.number().min(0).max(1),
});

export const reflectionModelOutputSchema = z.object({
  wentWell: z.array(z.string().trim().min(1)),
  wentWrong: z.array(z.string().trim().min(1)),
  likelyCauses: z.array(z.string().trim().min(1)).default([]),
  reusableTactics: z.array(z.string().trim().min(1)).default([]),
  learnings: z.array(reflectionLearningSchema).min(1),
  confidence: z.number().min(0).max(1),
});

export type ReflectionModelOutput = z.infer<typeof reflectionModelOutputSchema>;

const unwrapCodeFence = (value: string): string => {
  const trimmed = value.trim();
  const codeFenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim();
  }

  return trimmed;
};

export const parseReflectionModelOutput = (raw: string): ReflectionModelOutput => {
  const normalized = unwrapCodeFence(raw);
  return reflectionModelOutputSchema.parse(JSON.parse(normalized));
};
