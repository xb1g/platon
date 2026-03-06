import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMcpApp,
  listMemoryTools,
  registerMemoryTools,
} from "../src/server.js";

describe("MCP Server", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("lists namespace-aware tools without requiring paymentToken in tool arguments", () => {
    const tools = listMemoryTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "memory.dump_session",
      "memory.retrieve_context",
      "memory.get_similar_failures",
    ]);
    expect(tools[0]?.inputSchema.required).not.toContain("paymentToken");
    expect(tools[0]?.inputSchema.required).toContain("agentKind");
    expect(tools[0]?.inputSchema.required).toContain("agentId");
  });

  it("registers all memory tools through Nevermined MCP attach with 1 credit each", () => {
    const registerTool = vi.fn();
    const attach = vi.fn().mockReturnValue({ registerTool });
    const configure = vi.fn();

    registerMemoryTools(
      {} as never,
      {
        apiBaseUrl: "https://memory.example",
        internalAuthToken: "internal-secret",
        paymentsMcp: { attach, configure },
      }
    );

    expect(configure).toHaveBeenCalledOnce();
    expect(attach).toHaveBeenCalledOnce();
    expect(registerTool).toHaveBeenCalledTimes(3);
    expect(registerTool).toHaveBeenNthCalledWith(
      1,
      "memory.dump_session",
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({ credits: 1n })
    );
    expect(registerTool).toHaveBeenNthCalledWith(
      2,
      "memory.retrieve_context",
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({ credits: 1n })
    );
    expect(registerTool).toHaveBeenNthCalledWith(
      3,
      "memory.get_similar_failures",
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({ credits: 1n })
    );
  });

  it("fails app startup when internal auth token is missing", () => {
    expect(() =>
      createMcpApp({
        paymentsMcp: {
          configure: vi.fn(),
          attach: vi.fn().mockReturnValue({ registerTool: vi.fn() }),
        },
      })
    ).toThrow(/PLATON_INTERNAL_AUTH_TOKEN/);
  });

  it("forwards dump_session calls to the API with internal auth header and token-derived payment signature", async () => {
    const registerTool = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "session-row-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    registerMemoryTools(
      {} as never,
      {
        apiBaseUrl: "https://memory.example",
        internalAuthToken: "internal-secret",
        paymentsMcp: {
          configure: vi.fn(),
          attach: vi.fn().mockReturnValue({ registerTool }),
        },
      }
    );

    const dumpHandler = registerTool.mock.calls.find(([name]) => name === "memory.dump_session")?.[2];
    expect(dumpHandler).toBeTypeOf("function");

    const result = await dumpHandler(
      {
        agentKind: "support-agent",
        agentId: "agent-abc",
        sessionId: "session-123",
        task: { kind: "incident", summary: "Investigate Redis timeout" },
        outcome: { status: "failed", summary: "Redis reads failed during failover" },
      },
      { requestInfo: { headers: { authorization: "Bearer token-123" } } }
    );

    expect(result.isError).not.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://memory.example/sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "payment-signature": "token-123",
          "x-platon-internal-auth": "internal-secret",
        }),
      })
    );
  });

  it("rejects legacy content-only dump_session (requires structured task and outcome)", async () => {
    const registerTool = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    registerMemoryTools(
      {} as never,
      {
        apiBaseUrl: "https://memory.example",
        internalAuthToken: "internal-secret",
        paymentsMcp: {
          configure: vi.fn(),
          attach: vi.fn().mockReturnValue({ registerTool }),
        },
      }
    );

    const dumpHandler = registerTool.mock.calls.find(([name]) => name === "memory.dump_session")?.[2];
    expect(dumpHandler).toBeTypeOf("function");

    const result = await dumpHandler(
      {
        agentKind: "support-agent",
        agentId: "agent-abc",
        sessionId: "session-123",
        content: "Raw session log text only",
      },
      { requestInfo: { headers: { authorization: "Bearer token-123" } } }
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/invalid|validation|required/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards retrieval calls with namespace-aware inputs and internal auth", async () => {
    const registerTool = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: "Retry Redis reads after failover",
              summary: "A prior failure recovered after a bounded retry loop.",
              confidence: 0.83,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    registerMemoryTools(
      {} as never,
      {
        apiBaseUrl: "https://memory.example",
        internalAuthToken: "internal-secret",
        paymentsMcp: {
          configure: vi.fn(),
          attach: vi.fn().mockReturnValue({ registerTool }),
        },
      }
    );

    const retrieveHandler = registerTool.mock.calls.find(([name]) => name === "memory.retrieve_context")?.[2];
    expect(retrieveHandler).toBeTypeOf("function");

    const result = await retrieveHandler(
      {
        agentKind: "support-agent",
        agentId: "agent-abc",
        query: "redis failover",
        limit: 3,
        filters: {
          statuses: ["failed"],
          toolNames: ["redis-cli"],
        },
      },
      { requestInfo: { headers: { authorization: "Bearer token-456" } } }
    );

    expect(result.isError).not.toBe(true);
    expect(result.content[0]?.text).toContain("Retry Redis reads after failover");

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toMatchObject({
      agentKind: "support-agent",
      agentId: "agent-abc",
      query: "redis failover",
      limit: 3,
      filters: {
        statuses: ["failed"],
        toolNames: ["redis-cli"],
      },
    });
    expect(request.headers).toMatchObject({
      "payment-signature": "token-456",
      "x-platon-internal-auth": "internal-secret",
    });
  });
});
