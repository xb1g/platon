import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { dumpSession } from "./tools/dump-session.js";
import { retrieveContext } from "./tools/retrieve-context.js";
import { getSimilarFailures } from "./tools/get-similar-failures.js";

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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "memory.dump_session",
        description: "Dump a session for reflection and storage",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            content: { type: "string" },
          },
          required: ["sessionId", "content"],
        },
      },
      {
        name: "memory.retrieve_context",
        description: "Retrieve relevant context for a task",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
      {
        name: "memory.get_similar_failures",
        description: "Find similar past failures",
        inputSchema: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
          required: ["error"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Mock Nevermined check
  const hasCredits = true;
  if (!hasCredits) {
    throw new Error("Payment Required");
  }

  switch (request.params.name) {
    case "memory.dump_session":
      return await dumpSession(request.params.arguments);
    case "memory.retrieve_context":
      return await retrieveContext(request.params.arguments);
    case "memory.get_similar_failures":
      return await getSimilarFailures(request.params.arguments);
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
