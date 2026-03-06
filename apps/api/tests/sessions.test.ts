import { describe, it, expect } from 'vitest';
import { buildServer } from '../src/server.js';

describe('Sessions API', () => {
  it('accepts MCP-originated session payloads without tenantId when subscriber header is present', async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/sessions',
      headers: {
        'x-platon-subscriber-id': 'local-codex',
      },
      payload: {
        agentId: 'agent-123',
        agentKind: 'support-agent',
        sessionId: 'session-123',
        task: {
          kind: 'support-ticket',
          summary: 'Investigate failed order sync',
        },
        outcome: {
          status: 'failed',
          summary: 'Order sync failed due to a missing external identifier',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: 'mock-id',
      status: 'queued',
    });

    await app.close();
  });

  it('returns 400 when MCP payload is missing agentKind', async () => {
    const app = await buildServer();

    const response = await app.inject({
      method: 'POST',
      url: '/sessions',
      headers: {
        'x-platon-subscriber-id': 'local-codex',
      },
      payload: {
        agentId: 'agent-123',
        sessionId: 'session-123',
        task: {
          kind: 'support-ticket',
          summary: 'Investigate failed order sync',
        },
        outcome: {
          status: 'failed',
          summary: 'Order sync failed due to a missing external identifier',
        },
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
