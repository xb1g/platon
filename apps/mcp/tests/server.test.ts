import { afterEach, describe, expect, it, vi } from 'vitest';

import { callMemoryTool, listMemoryTools } from '../src/server.js';

describe('MCP Server', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('lists the paid namespace-aware tools', () => {
    const tools = listMemoryTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      'memory.dump_session',
      'memory.retrieve_context',
      'memory.get_similar_failures',
    ]);
    expect(tools[0]?.inputSchema.required).toContain('paymentToken');
    expect(tools[0]?.inputSchema.required).toContain('agentKind');
    expect(tools[0]?.inputSchema.required).toContain('agentId');
  });

  it('rejects unauthenticated tool calls', async () => {
    const verifyPayment = vi.fn();

    const result = await callMemoryTool(
      {
        name: 'memory.retrieve_context',
        arguments: {
          agentKind: 'support-agent',
          agentId: 'agent-abc',
          query: 'redis failover',
        },
      },
      { verifyPayment }
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('missing x402 payment token');
    expect(verifyPayment).not.toHaveBeenCalled();
  });

  it('allows local Codex development calls when a local subscriber env is configured', async () => {
    vi.stubEnv('PLATON_LOCAL_DEV_SUBSCRIBER_ID', 'local-codex');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callMemoryTool(
      {
        name: 'memory.retrieve_context',
        arguments: {
          agentKind: 'support-agent',
          agentId: 'agent-abc',
          query: 'redis failover',
        },
      },
      {
        apiBaseUrl: 'https://memory.example',
      }
    );

    expect(result.isError).not.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('forwards paid dump_session calls through the namespace-aware MCP surface', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'session-row-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const verifyPayment = vi.fn().mockResolvedValue({
      valid: true,
      subscriberId: 'sub-001',
    });

    const result = await callMemoryTool(
      {
        name: 'memory.dump_session',
        arguments: {
          paymentToken: 'token-123',
          agentKind: 'support-agent',
          agentId: 'agent-abc',
          sessionId: 'session-123',
          task: { kind: 'incident', summary: 'Investigate Redis timeout' },
          outcome: { status: 'failed', summary: 'Redis reads failed during failover' },
          errors: [{ message: 'ETIMEDOUT' }],
        },
      },
      {
        verifyPayment,
        apiBaseUrl: 'https://memory.example',
      }
    );

    expect(result.isError).not.toBe(true);
    expect(verifyPayment).toHaveBeenCalledWith('token-123');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://memory.example/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'payment-signature': 'token-123',
        }),
      })
    );

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toMatchObject({
      agentKind: 'support-agent',
      agentId: 'agent-abc',
      sessionId: 'session-123',
      task: { kind: 'incident', summary: 'Investigate Redis timeout' },
      outcome: { status: 'failed', summary: 'Redis reads failed during failover' },
    });
  });

  it('forwards paid retrieval calls with namespace-aware inputs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: 'Retry Redis reads after failover',
              summary: 'A prior failure recovered after a bounded retry loop.',
              confidence: 0.83,
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callMemoryTool(
      {
        name: 'memory.retrieve_context',
        arguments: {
          paymentToken: 'token-456',
          agentKind: 'support-agent',
          agentId: 'agent-abc',
          query: 'redis failover',
          limit: 3,
          filters: {
            statuses: ['failed'],
            toolNames: ['redis-cli'],
          },
        },
      },
      {
        verifyPayment: vi.fn().mockResolvedValue({ valid: true, subscriberId: 'sub-001' }),
        apiBaseUrl: 'https://memory.example',
      }
    );

    expect(result.isError).not.toBe(true);
    expect(result.content[0]?.text).toContain('Retry Redis reads after failover');

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toMatchObject({
      agentKind: 'support-agent',
      agentId: 'agent-abc',
      query: 'redis failover',
      limit: 3,
      filters: {
        statuses: ['failed'],
        toolNames: ['redis-cli'],
      },
    });
  });
});
