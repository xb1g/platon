import { parseSessionPayload } from "@memory/shared";
import type { ToolContext } from "../server.js";

export const dumpSession = async (
  args: Record<string, unknown>,
  context: ToolContext
) => {
  const payload = {
    agentKind: context.agentKind,
    agentId: context.agentId,
    sessionId: args.sessionId,
    inputContextSummary: args.inputContextSummary,
    tenantId: args.tenantId,
    task: args.task,
    outcome: args.outcome,
    tools: args.tools ?? [],
    events: args.events ?? [],
    artifacts: args.artifacts ?? [],
    errors: args.errors ?? [],
    humanFeedback: args.humanFeedback,
  };

  let parsed;
  try {
    parsed = parseSessionPayload(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Invalid payload: ${message}` }],
      isError: true,
    };
  }

  if (!context.accessToken) {
    return {
      content: [{ type: "text" as const, text: "Payment Required: missing Bearer token on MCP transport" }],
      isError: true,
    };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "payment-signature": context.accessToken,
      "x-platon-internal-auth": context.internalAuthToken,
    }

    const response = await fetch(`${context.apiBaseUrl}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        content: [{ type: "text" as const, text: `Session ingestion failed: ${error}` }],
        isError: true,
      };
    }

    const result = await response.json();
    return {
      content: [{ type: "text" as const, text: `Session ${parsed.sessionId} ingested successfully. ID: ${(result as { id?: string }).id ?? "unknown"}` }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Session ingestion error: ${(error as Error).message}` }],
      isError: true,
    };
  }
};
