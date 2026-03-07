import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { Payments } from "@nevermined-io/payments";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { retrievalRequestSchema, sessionPayloadSchema } from "@memory/shared";
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

export type ToolContext = {
  agentKind: string;
  agentId: string;
  apiBaseUrl: string;
  accessToken: string;
  internalAuthToken: string;
};

type PaymentsMcpLike = {
  configure: (options: { agentId: string; serverName?: string }) => void;
  attach: (server: {
    registerTool: (name: string, config: unknown, handler: unknown) => void;
  }) => {
    registerTool: (
      name: string,
      config: unknown,
      handler: (args: Record<string, unknown>, extra?: unknown) => Promise<ToolResult>,
      options?: { credits?: bigint }
    ) => void;
  };
};

export function loadWorkspaceEnv(envPath = fileURLToPath(new URL("../../../.env", import.meta.url))) {
  dotenv.config({ path: envPath });
}

loadWorkspaceEnv();

export type MemoryMcpServerDeps = {
  apiBaseUrl?: string;
  internalAuthToken?: string;
  paymentsMcp?: PaymentsMcpLike;
  paymentsService?: Payments;
  serverName?: string;
};

const namespaceProperties = {
  agentKind: { type: "string" as const, description: "The kind/type of agent" },
  agentId: { type: "string" as const, description: "The agent identifier" },
};

const getRequiredFields = (...fields: string[]) => fields;

const getAccessTokenFromExtra = (extra: unknown): string => {
  const headers = [
    (extra as { requestInfo?: { headers?: Record<string, unknown> } })?.requestInfo?.headers,
    (extra as { request?: { headers?: Record<string, unknown> } })?.request?.headers,
    (extra as { headers?: Record<string, unknown> })?.headers,
  ];

  for (const headerBag of headers) {
    if (!headerBag) {
      continue;
    }

    const raw =
      headerBag.authorization ??
      headerBag.Authorization ??
      Object.entries(headerBag).find(([key]) => key.toLowerCase() === "authorization")?.[1];

    if (typeof raw === "string" && raw.length > 0) {
      return raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw;
    }
  }

  return "";
};

const createPaymentsService = () => {
  const nvmApiKey = process.env.NVM_API_KEY;
  if (!nvmApiKey) {
    throw new Error("Missing NVM_API_KEY. Create one in nevermined.app and set it before starting the paid MCP server.");
  }

  return Payments.getInstance({
    nvmApiKey,
    environment: process.env.NVM_ENVIRONMENT === "live" ? "live" : "sandbox",
  });
};

function resolveInternalAuthToken(deps: MemoryMcpServerDeps): string {
  const internalAuthToken =
    deps.internalAuthToken ?? process.env.PLATON_INTERNAL_AUTH_TOKEN;

  if (!internalAuthToken) {
    throw new Error(
      "Missing PLATON_INTERNAL_AUTH_TOKEN. Set it before starting the MCP server."
    );
  }

  return internalAuthToken;
}

const buildToolContext = (
  args: Record<string, unknown>,
  extra: unknown,
  deps: MemoryMcpServerDeps
): ToolContext => ({
  agentKind: String(args.agentKind ?? ""),
  agentId: String(args.agentId ?? ""),
  apiBaseUrl: deps.apiBaseUrl ?? process.env.MEMORY_API_URL ?? "http://localhost:3001",
  accessToken: getAccessTokenFromExtra(extra),
  internalAuthToken: resolveInternalAuthToken(deps),
});

export const listMemoryTools = (): ToolSchema[] => [
  {
    name: "memory.dump_session",
    description:
      "Dump a session for reflection and storage. Uses canonical session payload (task, outcome, optional tools/events/artifacts/errors). Legacy content-only usage is not supported.",
    inputSchema: {
      type: "object",
      properties: {
        ...namespaceProperties,
        sessionId: { type: "string" as const, description: "Unique session identifier" },
        inputContextSummary: {
          type: "string" as const,
          description: "Optional summary of input context",
        },
        tenantId: {
          type: "string" as const,
          description: "Optional tenant for namespace resolution",
        },
        task: {
          type: "object" as const,
          description: "Required task descriptor",
          properties: {
            kind: { type: "string" as const },
            summary: { type: "string" as const },
          },
          required: ["kind", "summary"],
        },
        outcome: {
          type: "object" as const,
          description: "Required outcome descriptor",
          properties: {
            status: { type: "string" as const, enum: ["success", "failed", "partial"] },
            summary: { type: "string" as const },
          },
          required: ["status", "summary"],
        },
        tools: {
          type: "array" as const,
          description: "Optional list of tools used",
          items: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
              category: { type: "string" as const },
            },
            required: ["name", "category"],
          },
        },
        events: {
          type: "array" as const,
          description: "Optional session events",
          items: {
            type: "object" as const,
            properties: {
              type: { type: "string" as const },
              summary: { type: "string" as const },
            },
            required: ["type", "summary"],
          },
        },
        artifacts: {
          type: "array" as const,
          description: "Optional artifacts (kind, uri, summary)",
          items: {
            type: "object" as const,
            properties: {
              kind: { type: "string" as const },
              uri: { type: "string" as const },
              summary: { type: "string" as const },
            },
            required: ["kind", "uri"],
          },
        },
        errors: {
          type: "array" as const,
          description: "Optional errors (message, optional code, retryable)",
          items: {
            type: "object" as const,
            properties: {
              message: { type: "string" as const },
              code: { type: "string" as const },
              retryable: { type: "boolean" as const },
            },
            required: ["message"],
          },
        },
        humanFeedback: {
          type: "object" as const,
          description: "Optional human feedback (rating 1-5, summary)",
          properties: {
            rating: { type: "number" as const },
            summary: { type: "string" as const },
          },
          required: ["rating", "summary"],
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
        limit: { type: "number" as const },
      },
      required: getRequiredFields("agentKind", "agentId", "error"),
    },
  },
];

export const registerMemoryTools = (
  server: McpServer,
  deps: MemoryMcpServerDeps = {}
) => {
  resolveInternalAuthToken(deps);

  const paymentsMcp =
    deps.paymentsMcp ?? (deps.paymentsService ?? createPaymentsService()).mcp;
  const serverName = deps.serverName ?? process.env.MCP_SERVER_NAME ?? "platon-memory";
  const agentId = process.env.NVM_AGENT_ID ?? "platon-memory-mcp";
  const registrar = paymentsMcp.attach(server);

  paymentsMcp.configure({ agentId, serverName });

  registrar.registerTool(
    "memory.dump_session",
    {
      title: "Dump Session",
      description: listMemoryTools()[0].description,
      inputSchema: sessionPayloadSchema,
    },
    async (args, extra) =>
      dumpSession(args, buildToolContext(args, extra, deps)),
    { credits: 1n }
  );

  registrar.registerTool(
    "memory.retrieve_context",
    {
      title: "Retrieve Context",
      description: listMemoryTools()[1].description,
      inputSchema: retrievalRequestSchema,
    },
    async (args, extra) =>
      retrieveContext(args, buildToolContext(args, extra, deps)),
    { credits: 1n }
  );

  registrar.registerTool(
    "memory.get_similar_failures",
    {
      title: "Get Similar Failures",
      description: listMemoryTools()[2].description,
      inputSchema: z.object({
        agentKind: z.string().min(1),
        agentId: z.string().min(1),
        error: z.string().min(1),
        limit: z.number().int().positive().optional(),
      }),
    },
    async (args, extra) =>
      getSimilarFailures(args, buildToolContext(args, extra, deps)),
    { credits: 1n }
  );
};

export const createMcpServer = (deps: MemoryMcpServerDeps = {}) => {
  const server = new McpServer(
    {
      name: deps.serverName ?? process.env.MCP_SERVER_NAME ?? "platon-memory",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerMemoryTools(server, deps);

  return server;
};

export const createMcpApp = (
  deps: MemoryMcpServerDeps = {}
): ReturnType<typeof createMcpExpressApp> => {
  resolveInternalAuthToken(deps);

  const host = process.env.MCP_SERVER_HOST ?? "127.0.0.1";
  const app = createMcpExpressApp({ host });

  app.post("/mcp", async (req: any, res: any) => {
    const server = createMcpServer(deps);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (_req: any, res: any) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      })
    );
  });

  app.delete("/mcp", async (_req: any, res: any) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      })
    );
  });

  return app;
};

async function main() {
  const port = Number(process.env.MCP_SERVER_PORT ?? process.env.MCP_PORT ?? 3002);
  const host = process.env.MCP_SERVER_HOST ?? "127.0.0.1";
  const app = createMcpApp();

  app.listen(port, host, () => {
    console.error(`Memory MCP server running at http://${host}:${port}/mcp`);
  });
}

const isEntrypoint =
  typeof process.argv[1] === "string" && process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint && process.env.VITEST !== "true") {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
