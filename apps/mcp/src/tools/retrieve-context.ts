import type { ToolContext } from "../server.js";

export const retrieveContext = async (
  args: Record<string, unknown>,
  context: ToolContext
) => {
  if (!context.accessToken) {
    return {
      content: [{ type: "text" as const, text: "Payment Required: missing Bearer token on MCP transport" }],
      isError: true,
    };
  }

  if (!context.internalAuthToken) {
    return {
      content: [{ type: "text" as const, text: "Server misconfiguration: missing PLATON_INTERNAL_AUTH_TOKEN" }],
      isError: true,
    };
  }

  const payload = {
    agentId: context.agentId,
    agentKind: context.agentKind,
    query: args.query,
    limit: args.limit ?? 5,
    filters: args.filters ?? {},
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "payment-signature": context.accessToken,
      "x-platon-internal-auth": context.internalAuthToken,
    };

    const response = await fetch(`${context.apiBaseUrl}/retrieve`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: "text" as const, text: `Retrieval failed: ${error}` }],
        isError: true,
      };
    }

    const result = (await response.json()) as { results: Array<{ title: string; summary: string; confidence: number }> };
    const formatted = result.results
      .map((r, i) => `${i + 1}. [${r.confidence.toFixed(2)}] ${r.title}: ${r.summary}`)
      .join("\n");

    return {
      content: [{ type: "text" as const, text: formatted || "No relevant context found." }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Retrieval error: ${(error as Error).message}` }],
      isError: true,
    };
  }
};
