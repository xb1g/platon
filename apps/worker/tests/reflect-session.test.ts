import { beforeEach, describe, expect, it, vi } from 'vitest';

const { llmReflect } = vi.hoisted(() => ({
  llmReflect: vi.fn(),
}));

vi.mock('../src/lib/llm.js', () => ({
  llmReflect,
}));

import { reflectSession } from '../src/jobs/reflect-session.js';
import { resolveNamespace } from '../src/lib/memory-namespace.js';
import { storeReflection, type ReflectionData } from '../src/lib/store-reflection.js';

const baseNamespace = {
  subscriberId: 'sub-001',
  agentKind: 'support-agent',
  agentId: 'agent-abc',
};

const otherNamespace = {
  subscriberId: 'sub-002',
  agentKind: 'support-agent',
  agentId: 'agent-abc',
};

const reflection: ReflectionData = {
  sessionId: 'session-123',
  wentWell: [],
  wentWrong: ['Redis timed out while reading the cache'],
  likelyCauses: ['A failover was still in progress'],
  reusableTactics: ['Retry reads with bounded backoff'],
  learnings: [{ title: 'Retry Redis reads after failover', confidence: 0.82 }],
  confidence: 0.74,
};

describe('Reflect Session Job', () => {
  beforeEach(() => {
    llmReflect.mockReset();
  });

  it('creates or reuses the correct namespace before attaching session and learnings', async () => {
    llmReflect.mockResolvedValue(reflection);
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    await reflectSession(
      {
        ...baseNamespace,
        sessionId: reflection.sessionId,
        task: { kind: 'incident', summary: 'Investigate Redis timeout' },
        outcome: { status: 'failed', summary: 'Redis reads failed during failover' },
      },
      { session }
    );

    const resolved = resolveNamespace(baseNamespace);

    expect(llmReflect).toHaveBeenCalledOnce();
    expect(session.run).toHaveBeenCalledTimes(3);
    expect(session.run.mock.calls[0][1]).toMatchObject({
      namespaceId: resolved.namespaceId,
      subscriberId: baseNamespace.subscriberId,
      agentKind: baseNamespace.agentKind,
      agentId: baseNamespace.agentId,
    });
    expect(session.run.mock.calls[1][1]).toMatchObject({
      namespaceId: resolved.namespaceId,
      sessionId: reflection.sessionId,
    });
    expect(session.run.mock.calls[1][1].sessionKey).toBeDefined();
    expect(session.run.mock.calls[2][1]).toMatchObject({
      namespaceId: resolved.namespaceId,
      sessionId: reflection.sessionId,
      title: 'Retry Redis reads after failover',
    });
    expect(session.run.mock.calls[2][1].learningKey).toBeDefined();
    expect(session.run.mock.calls[2][0]).toContain('MERGE (ns)-[:HAS_LEARNING]->(l)');
  });

  it('keeps identical failure patterns separated across namespaces', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    await storeReflection(reflection, baseNamespace, { session });
    await storeReflection(reflection, otherNamespace, { session });

    const firstSessionParams = session.run.mock.calls[1][1];
    const firstLearningParams = session.run.mock.calls[2][1];
    const secondSessionParams = session.run.mock.calls[4][1];
    const secondLearningParams = session.run.mock.calls[5][1];

    expect(firstSessionParams.namespaceId).not.toBe(secondSessionParams.namespaceId);
    expect(firstSessionParams.sessionKey).not.toBe(secondSessionParams.sessionKey);
    expect(firstLearningParams.learningKey).not.toBe(secondLearningParams.learningKey);
  });
});
