import { describe, expect, it } from "vitest";

import {
  parseRetrievalRequest,
  reflectionSchema,
  retrievalResponseSchema,
  retrievalRequestSchema,
  sessionPayloadSchema
} from "../src/index.js";

describe("sessionPayloadSchema", () => {
  it("accepts a valid agent session payload with structured context", () => {
    const result = sessionPayloadSchema.safeParse({
      agentId: "agent_123",
      agentKind: "support-agent",
      sessionId: "session_123",
      inputContextSummary: "The agent received a support escalation and prior run notes.",
      task: {
        kind: "support-ticket",
        summary: "Investigate failed order sync"
      },
      outcome: {
        status: "failed",
        summary: "Order sync failed due to a missing external identifier"
      },
      tools: [
        {
          name: "shopify-api",
          category: "api"
        }
      ],
      events: [
        {
          type: "tool_call",
          summary: "Fetched order details from Shopify"
        }
      ],
      artifacts: [
        {
          kind: "log",
          uri: "s3://sessions/session_123/log.txt",
          summary: "Captured request and response bodies"
        }
      ],
      errors: [
        {
          message: "Missing external identifier",
          code: "MISSING_EXTERNAL_ID",
          retryable: false
        }
      ],
      humanFeedback: {
        rating: 4,
        summary: "The diagnosis was correct but the remediation was incomplete."
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      inputContextSummary:
        "The agent received a support escalation and prior run notes.",
      artifacts: [
        {
          kind: "log",
          uri: "s3://sessions/session_123/log.txt",
          summary: "Captured request and response bodies"
        }
      ],
      errors: [
        {
          message: "Missing external identifier",
          code: "MISSING_EXTERNAL_ID",
          retryable: false
        }
      ]
    });
  });

  it("rejects a session payload without required identifiers", () => {
    const result = sessionPayloadSchema.safeParse({
      agentId: "agent_123",
      sessionId: "session_123",
      task: {
        kind: "support-ticket",
        summary: "Investigate failed order sync"
      },
      outcome: {
        status: "failed",
        summary: "Order sync failed due to a missing external identifier"
      }
    });

    expect(result.success).toBe(false);
  });

  it("does not require tenantId for runtime namespace resolution", () => {
    const result = sessionPayloadSchema.safeParse({
      agentId: "agent_123",
      agentKind: "support-agent",
      sessionId: "session_123",
      task: {
        kind: "support-ticket",
        summary: "Investigate failed order sync"
      },
      outcome: {
        status: "failed",
        summary: "Order sync failed due to a missing external identifier"
      }
    });

    expect(result.success).toBe(true);
  });

  it("requires agentKind for runtime namespace resolution", () => {
    const result = sessionPayloadSchema.safeParse({
      agentId: "agent_123",
      sessionId: "session_123",
      task: {
        kind: "support-ticket",
        summary: "Investigate failed order sync"
      },
      outcome: {
        status: "failed",
        summary: "Order sync failed due to a missing external identifier"
      }
    });

    expect(result.success).toBe(false);
  });
});

describe("reflectionSchema", () => {
  it("accepts a structured reflection result", () => {
    const result = reflectionSchema.safeParse({
      sessionId: "session_123",
      wentWell: ["Captured enough session detail to diagnose the failure quickly."],
      wentWrong: ["The sync failed because the source record had no external ID."],
      likelyCauses: ["The upstream CRM record was created without the required field."],
      reusableTactics: ["Validate required identifiers before attempting a sync."],
      learnings: [
        {
          title: "Check external identifiers before sync",
          confidence: 0.8
        }
      ],
      confidence: 0.82,
      provenance: {
        sessionId: "session_123",
        generatedBy: "reflection-worker"
      }
    });

    expect(result.success).toBe(true);
  });
});

describe("retrievalRequestSchema", () => {
  it("accepts a retrieval request with ranking inputs", () => {
    const result = retrievalRequestSchema.safeParse({
      agentId: "agent_123",
      agentKind: "support-agent",
      query: "Find prior failed sync runs caused by missing IDs",
      limit: 5,
      filters: {
        statuses: ["failed"],
        toolNames: ["shopify-api"]
      }
    });

    expect(result.success).toBe(true);
  });

  it("applies defaults when ranking inputs are omitted", () => {
    const result = parseRetrievalRequest({
      agentId: "agent_123",
      agentKind: "support-agent",
      query: "Find similar retrieval failures"
    });

    expect(result.limit).toBe(5);
    expect(result.filters).toEqual({
      statuses: [],
      toolNames: []
    });
  });

  it("does not require tenantId for runtime retrieval payloads", () => {
    const result = retrievalRequestSchema.safeParse({
      agentId: "agent_123",
      agentKind: "support-agent",
      query: "Find similar retrieval failures"
    });

    expect(result.success).toBe(true);
  });

  it("requires agentKind for runtime retrieval payloads", () => {
    const result = retrievalRequestSchema.safeParse({
      agentId: "agent_123",
      query: "Find similar retrieval failures"
    });

    expect(result.success).toBe(false);
  });
});

describe("retrievalResponseSchema", () => {
  it("validates the ranked retrieval response payload", () => {
    const result = retrievalResponseSchema.safeParse({
      results: [
        {
          id: "learning_1",
          type: "learning",
          title: "Validate identifiers before sync",
          summary: "Prior failed runs improved after checking identifiers first.",
          confidence: 0.91
        }
      ]
    });

    expect(result.success).toBe(true);
  });
});
