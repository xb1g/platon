import { z } from "zod";

import { memoryStatusSchema } from "./reflection.js";
import { sourceProvenanceSchema } from "./session.js";

export const retrievalFiltersSchema = z.object({
  statuses: z.array(z.enum(["success", "failed", "partial"])).default([]),
  toolNames: z.array(z.string().min(1)).default([])
});

export const retrievalRequestSchema = z.object({
  agentId: z.string().min(1),
  agentKind: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).default(5),
  filters: retrievalFiltersSchema.default({
    statuses: [],
    toolNames: []
  })
});

export const retrievalReasonSchema = z.object({
  kind: z.enum([
    "semantic_similarity",
    "graph_neighbor",
    "confidence",
    "freshness",
    "provenance_quality",
    "usefulness",
    "conflict_penalty"
  ]),
  summary: z.string().min(1),
  score: z.number().min(0).max(1).optional()
});

export const retrievalResultSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["learning", "session", "failure", "success_pattern"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  status: memoryStatusSchema.optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  reasons: z.array(retrievalReasonSchema).default([]),
  sourceProvenance: z.array(sourceProvenanceSchema).default([])
});

export const retrievalResponseSchema = z.object({
  results: z.array(retrievalResultSchema)
});

export type RetrievalFilters = z.infer<typeof retrievalFiltersSchema>;
export type RetrievalReason = z.infer<typeof retrievalReasonSchema>;
export type RetrievalRequest = z.infer<typeof retrievalRequestSchema>;
export type RetrievalResponse = z.infer<typeof retrievalResponseSchema>;
export type RetrievalResult = z.infer<typeof retrievalResultSchema>;

export const parseRetrievalRequest = (input: unknown): RetrievalRequest =>
  retrievalRequestSchema.parse(input);

export const parseRetrievalResponse = (input: unknown): RetrievalResponse =>
  retrievalResponseSchema.parse(input);
