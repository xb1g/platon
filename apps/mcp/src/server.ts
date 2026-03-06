import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { dumpSession } from "./tools/dump-session.js";
import { retrieveContext } from "./tools/retrieve-context.js";
import { getSimilarFailures } from "./tools/get-similar-failures.js";

type ToolSchema = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
};

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type McpPaymentVerifier = (token: string) => Promise<{
  valid: boolean;
  subscriberId?: string;
}>;

export type McpServerDeps = {
  verifyPayment?: McpPaymentVerifier;
  apiBaseUrl?: string;
};

export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type ToolContext = {
  subscriberId: string;
  agentKind: string;
  agentId: string;
  apiBaseUrl: string;
  paymentToken: string;
};

const defaultVerifyPayment: McpPaymentVerifier = async () => ({
  valid: false,
});

const namespaceProperties = {
  agentKind: { type: "string" as const, description: "The kind/type of agent" },
  agentId: { type: "string" as const, description: "The agent identifier" },
  paymentToken: { type: "string" as const, description: "x402 payment signature token" },
};

const getLocalDevSubscriberId = () => process.env.PLATON_LOCAL_DEV_SUBSCRIBER_ID;

const getRequiredFields = (...fields: string[]) =>
  getLocalDevSubscriberId() ? fields : [...fields, "paymentToken"];

export const listMemoryTools = (): ToolSchema[] => [
  {
    name: "memory.dump_session",
    description: "Dump a session for reflection and storage",
    inputSchema: {
      type: "object",
      properties: {
        ...namespaceProperties,
        sessionId: { type: "string" as const },
        task: {
          type: "object" as const,
          properties: {
            kind: { type: "string" as const },
            summary: { type: "string" as const },
          },
          required: ["kind", "summary"],
        },
        outcome: {
          type: "object" as const,
          properties: {
            status: { type: "string" as const, enum: ["success", "failed", "partial"] },
            summary: { type: "string" as const },
          },
          required: ["status", "summary"],
        },
      },
      required: getRequiredFields("agentKind", "agentId", "sessionId", "task", "outcome"),
    },
  },
  {
    name: "memory.retrieve_context",
    description: "Retrieve relevant context for a task",
    inputSchema: {
      type: "object",
      properties: {
        ...namespaceProperties,
        query: { type: "string" as const },
        limit: { type: "number" as const },
      },
      required: getRequiredFields("agentKind", "agentId", "query"),
    },
  },
  {
    name: "memory.get_similar_failures",
    description: "Find similar past failures",
    inputSchema: {
      type: "object",
      properties: {
        ...namespaceProperties,
        error: { type: "string" as const },
      },
      required: getRequiredFields("agentKind", "agentId", "error"),
    },
  },
];

export const callMemoryTool = async (
  request: ToolCall,
  deps: McpServerDeps = {}
): Promise<ToolResult> => {
  const verifyPayment = deps.verifyPayment ?? defaultVerifyPayment;
  const apiBaseUrl = deps.apiBaseUrl ?? process.env.MEMORY_API_URL ?? "http://localhost:3001";
  const args = request.arguments ?? {};
  const paymentToken = args.paymentToken;
  const verifiedPaymentToken = typeof paymentToken === "string" ? paymentToken : "";
  const localDevSubscriberId = getLocalDevSubscriberId();

  if ((!paymentToken || typeof paymentToken !== "string" || paymentToken.length === 0) && !localDevSubscriberId) {
    return {
      content: [{ type: "text", text: "Payment Required: missing x402 payment token" }],
      isError: true,
    };
  }

  const verification = localDevSubscriberId
    ? { valid: true, subscriberId: localDevSubscriberId }
    : await verifyPayment(verifiedPaymentToken);

  if (!verification.valid || !verification.subscriberId) {
    return {
      content: [{ type: "text", text: "Payment Required: invalid x402 payment token" }],
      isError: true,
    };
  }

  const toolContext: ToolContext = {
    subscriberId: verification.subscriberId,
    agentKind: String(args.agentKind ?? ""),
    agentId: String(args.agentId ?? ""),
    apiBaseUrl,
    paymentToken: verifiedPaymentToken,
  };

  switch (request.name) {
    case "memory.dump_session":
      return dumpSession(args, toolContext);
    case "memory.retrieve_context":
      return retrieveContext(args, toolContext);
    case "memory.get_similar_failures":
      return getSimilarFailures(args, toolContext);
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${request.name}` }],
        isError: true,
      };
  }
};

export const createMcpServer = (deps: McpServerDeps = {}) => {
  const server = new Server(
    {
      name: "memory-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listMemoryTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callMemoryTool(
      {
        name: request.params.name,
        arguments: (request.params.arguments ?? {}) as Record<string, unknown>,
      },
      deps
    )
  );

  return server;
};

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory MCP server running on stdio");
}

const isEntrypoint =
  typeof process.argv[1] === "string" && process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint && process.env.VITEST !== "true") {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
