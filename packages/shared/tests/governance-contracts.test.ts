import { describe, expect, it } from "vitest";
import { z } from "zod";

import * as shared from "../src/index.js";

describe("governance memory contracts", () => {
  it("requires provenance fields on published memory", () => {
    const publishedMemorySchema = (shared as Record<string, unknown>)
      .publishedMemorySchema as z.ZodTypeAny | undefined;

    expect(publishedMemorySchema).toBeDefined();
    if (!publishedMemorySchema) {
      return;
    }

    const result = publishedMemorySchema.safeParse({
      id: "memory_123",
      kind: "learning",
      title: "Validate external identifiers before sync",
      content: "Check for missing IDs before attempting outbound syncs.",
      confidence: 0.91,
      qualityScore: 0.88,
      status: "published"
    });

    expect(result.success).toBe(false);
  });

  it("supports suppression status and quality score", () => {
    const publishedMemorySchema = (shared as Record<string, unknown>)
      .publishedMemorySchema as z.ZodTypeAny | undefined;

    expect(publishedMemorySchema).toBeDefined();
    if (!publishedMemorySchema) {
      return;
    }

    const result = publishedMemorySchema.safeParse({
      id: "memory_123",
      kind: "learning",
      title: "Suppress contradictory memory",
      content: "A contradicted memory should stay queryable for audit but not rank.",
      confidence: 0.55,
      qualityScore: 0.22,
      status: "suppressed",
      suppressionReason: "contradicted_by_newer_signal",
      provenance: {
        rawSessionId: "session_123",
        reflectionVersion: "v1",
        sourceSessionIds: ["session_123"]
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      qualityScore: 0.22,
      status: "suppressed",
      suppressionReason: "contradicted_by_newer_signal"
    });
  });

  it("supports retrieval reasons and source provenance", () => {
    const result = shared.retrievalResponseSchema.safeParse({
      results: [
        {
          id: "memory_123",
          type: "learning",
          title: "Validate external identifiers before sync",
          summary: "Prior failures improved after validating IDs up front.",
          confidence: 0.91,
          reasons: [
            {
              kind: "provenance_quality",
              summary: "This memory comes from a recent successful remediation.",
              score: 0.73
            }
          ],
          sourceProvenance: [
            {
              sessionId: "session_123",
              reflectionId: "reflection_123",
              observedAt: "2026-03-06T16:30:00.000Z"
            }
          ]
        }
      ]
    });

    expect(result.success).toBe(true);
    expect(result.data.results[0]).toMatchObject({
      reasons: [
        {
          kind: "provenance_quality",
          summary: "This memory comes from a recent successful remediation.",
          score: 0.73
        }
      ],
      sourceProvenance: [
        {
          sessionId: "session_123",
          reflectionId: "reflection_123",
          observedAt: "2026-03-06T16:30:00.000Z"
        }
      ]
    });
  });
});
