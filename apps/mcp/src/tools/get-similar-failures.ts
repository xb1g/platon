import type { ToolContext, ToolResult } from "../server.js";

export const getSimilarFailures = async (
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> => {
  const payload = {
    agentId: context.agentId,
    agentKind: context.agentKind,
    query: args.error,
    limit: args.limit ?? 5,
    filters: {
      statuses: ["failed"],
      ...(typeof args.filters === "object" && args.filters ? (args.filters as Record<string, unknown>) : {}),
    },
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-platon-subscriber-id": context.subscriberId,
    };

    if (context.paymentToken) {
      headers["payment-signature"] = context.paymentToken;
    }

    const response = await fetch(`${context.apiBaseUrl}/retrieve`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: "text", text: `Similar failure lookup failed: ${error}` }],
        isError: true,
      };
    }

    const result = (await response.json()) as {
      results: Array<{ title: string; summary: string; confidence: number }>;
    };
    const formatted = result.results
      .map((r, i) => `${i + 1}. [${r.confidence.toFixed(2)}] ${r.title}: ${r.summary}`)
      .join("\n");

    return {
      content: [{ type: "text", text: formatted || "No similar failures found." }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Similar failure lookup error: ${(error as Error).message}` }],
      isError: true,
    };
  }
};
