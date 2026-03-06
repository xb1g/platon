import type { ToolContext } from "../server.js";

export const dumpSession = async (
  args: Record<string, unknown>,
  context: ToolContext
) => {
  const payload = {
    agentId: context.agentId,
    agentKind: context.agentKind,
    sessionId: args.sessionId,
    task: args.task,
    outcome: args.outcome,
    tools: args.tools ?? [],
    events: args.events ?? [],
    artifacts: args.artifacts ?? [],
    errors: args.errors ?? [],
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-platon-subscriber-id": context.subscriberId,
    };

    if (context.paymentToken) {
      headers["payment-signature"] = context.paymentToken;
    }

    const response = await fetch(`${context.apiBaseUrl}/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
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
      content: [{ type: "text" as const, text: `Session ${args.sessionId} ingested successfully. ID: ${(result as any).id}` }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Session ingestion error: ${(error as Error).message}` }],
      isError: true,
    };
  }
};
