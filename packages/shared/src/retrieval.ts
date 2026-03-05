import { z } from "zod";

export const retrievalFiltersSchema = z.object({
  statuses: z.array(z.enum(["success", "failed", "partial"])).default([]),
  toolNames: z.array(z.string().min(1)).default([])
});

export const retrievalRequestSchema = z.object({
  tenantId: z.string().min(1),
  agentId: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).default(5),
  filters: retrievalFiltersSchema.default({
    statuses: [],
    toolNames: []
  })
});

export const retrievalResultSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["learning", "session", "failure", "success_pattern"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const retrievalResponseSchema = z.object({
  results: z.array(retrievalResultSchema)
});

export type RetrievalFilters = z.infer<typeof retrievalFiltersSchema>;
export type RetrievalRequest = z.infer<typeof retrievalRequestSchema>;
export type RetrievalResponse = z.infer<typeof retrievalResponseSchema>;
export type RetrievalResult = z.infer<typeof retrievalResultSchema>;

export const parseRetrievalRequest = (input: unknown): RetrievalRequest =>
  retrievalRequestSchema.parse(input);

export const parseRetrievalResponse = (input: unknown): RetrievalResponse =>
  retrievalResponseSchema.parse(input);
