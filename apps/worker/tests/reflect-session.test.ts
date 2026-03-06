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

  it('persisted raw session with failures produces namespace merge, session merge, learning merge, and failed session status in Neo4j', async () => {
    const failureReflection: ReflectionData = {
      sessionId: 'session-fail-456',
      wentWell: [],
      wentWrong: ['Deployment script exited with code 1', 'Missing env var DATABASE_URL'],
      likelyCauses: ['Config not loaded before run'],
      reusableTactics: ['Validate env before deploy'],
      learnings: [{ title: 'Always validate env vars before deploy', confidence: 0.9 }],
      confidence: 0.85,
    };

    llmReflect.mockResolvedValue(failureReflection);
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    const persistedInput = {
      ...baseNamespace,
      sessionId: 'session-fail-456',
      task: { kind: 'deploy', summary: 'Deploy to staging' },
      outcome: { status: 'failed', summary: 'Deployment failed' },
      errors: [{ message: 'Deployment script exited with code 1', code: 'EXIT_1', retryable: false }],
    };

    await reflectSession(persistedInput, { session });

    const resolved = resolveNamespace(baseNamespace);

    expect(session.run).toHaveBeenCalledTimes(3);

    const namespaceMergeParams = session.run.mock.calls[0][1];
    expect(namespaceMergeParams).toMatchObject({
      namespaceId: resolved.namespaceId,
      subscriberId: baseNamespace.subscriberId,
      agentKind: baseNamespace.agentKind,
      agentId: baseNamespace.agentId,
    });
    expect(session.run.mock.calls[0][0]).toContain('MERGE (ns:MemoryNamespace');

    const sessionMergeParams = session.run.mock.calls[1][1];
    expect(sessionMergeParams).toMatchObject({
      namespaceId: resolved.namespaceId,
      sessionId: failureReflection.sessionId,
      wentWrong: failureReflection.wentWrong,
      confidence: failureReflection.confidence,
    });
    expect(sessionMergeParams.wentWrong).toHaveLength(2);
    expect(session.run.mock.calls[1][0]).toContain("s.status = CASE WHEN size($wentWrong) > 0 THEN 'failed' ELSE 'success' END");

    const learningMergeParams = session.run.mock.calls[2][1];
    expect(learningMergeParams).toMatchObject({
      namespaceId: resolved.namespaceId,
      sessionId: failureReflection.sessionId,
      title: 'Always validate env vars before deploy',
      confidence: 0.9,
    });
    expect(session.run.mock.calls[2][0]).toContain('MERGE (ns)-[:HAS_LEARNING]->(l)');
  });

  it('persisted raw session with success produces success session status in Neo4j', async () => {
    const successReflection: ReflectionData = {
      sessionId: 'session-ok-789',
      wentWell: ['Deployment completed', 'Health check passed'],
      wentWrong: [],
      likelyCauses: [],
      reusableTactics: ['Use same flow for prod'],
      learnings: [{ title: 'Staging deploy flow is reliable', confidence: 0.95 }],
      confidence: 0.92,
    };

    llmReflect.mockResolvedValue(successReflection);
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    const persistedInput = {
      ...baseNamespace,
      sessionId: 'session-ok-789',
      task: { kind: 'deploy', summary: 'Deploy to staging' },
      outcome: { status: 'success', summary: 'Deployment succeeded' },
    };

    await reflectSession(persistedInput, { session });

    const sessionMergeParams = session.run.mock.calls[1][1];
    expect(sessionMergeParams.wentWrong).toHaveLength(0);
    expect(session.run.mock.calls[1][0]).toContain("s.status = CASE WHEN size($wentWrong) > 0 THEN 'failed' ELSE 'success' END");
  });

  describe('reflection status in Postgres', () => {
    it('sets reflection_status to processing when job starts', async () => {
      const markProcessing = vi.fn().mockResolvedValue(undefined);
      const markCompleted = vi.fn().mockResolvedValue(undefined);
      llmReflect.mockResolvedValue(reflection);
      const session = { run: vi.fn().mockResolvedValue({ records: [] }) } as any;
      const rawSessionId = 42;

      await reflectSession(
        {
          ...baseNamespace,
          rawSessionId,
          sessionId: reflection.sessionId,
          task: { kind: 'incident', summary: 'Investigate Redis timeout' },
          outcome: { status: 'failed', summary: 'Redis reads failed' },
        },
        {
          session,
          sessionStore: { markReflectionProcessing: markProcessing, markReflectionCompleted: markCompleted, markReflectionFailed: vi.fn() },
        }
      );

      expect(markProcessing).toHaveBeenCalledOnce();
      expect(markProcessing).toHaveBeenCalledWith(rawSessionId);
      expect(markCompleted).toHaveBeenCalledWith(rawSessionId);
    });

    it('sets reflection_status to completed and reflection_completed_at after success', async () => {
      const markProcessing = vi.fn().mockResolvedValue(undefined);
      const markCompleted = vi.fn().mockResolvedValue(undefined);
      llmReflect.mockResolvedValue(reflection);
      const session = { run: vi.fn().mockResolvedValue({ records: [] }) } as any;
      const rawSessionId = 99;

      await reflectSession(
        {
          ...baseNamespace,
          rawSessionId,
          sessionId: reflection.sessionId,
          task: { kind: 'incident', summary: 'Investigate Redis timeout' },
          outcome: { status: 'failed', summary: 'Redis reads failed' },
        },
        {
          session,
          sessionStore: { markReflectionProcessing: markProcessing, markReflectionCompleted: markCompleted, markReflectionFailed: vi.fn() },
        }
      );

      expect(markCompleted).toHaveBeenCalledOnce();
      expect(markCompleted).toHaveBeenCalledWith(rawSessionId);
    });

    it('sets reflection_status to failed and reflection_error after reflection throws', async () => {
      const markProcessing = vi.fn().mockResolvedValue(undefined);
      const markFailed = vi.fn().mockResolvedValue(undefined);
      llmReflect.mockRejectedValue(new Error('LLM rate limit exceeded'));
      const rawSessionId = 7;

      const session = { run: vi.fn().mockResolvedValue({ records: [] }) } as any;
      await expect(
        reflectSession(
          {
            ...baseNamespace,
            rawSessionId,
            sessionId: 'session-err',
            task: { kind: 'incident', summary: 'Investigate' },
            outcome: { status: 'failed', summary: 'Failed' },
          },
          {
            session,
            sessionStore: { markReflectionProcessing: markProcessing, markReflectionCompleted: vi.fn(), markReflectionFailed: markFailed },
          }
        )
      ).rejects.toThrow('LLM rate limit exceeded');

      expect(markProcessing).toHaveBeenCalledWith(rawSessionId);
      expect(markFailed).toHaveBeenCalledOnce();
      expect(markFailed).toHaveBeenCalledWith(rawSessionId, 'LLM rate limit exceeded');
    });
  });
});
