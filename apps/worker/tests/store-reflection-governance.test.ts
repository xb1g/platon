import { describe, expect, it, vi } from 'vitest';
import { storeReflection } from '../src/lib/store-reflection.js';

const namespace = {
  subscriberId: 'sub-001',
  agentKind: 'support-agent',
  agentId: 'agent-abc',
};

describe('storeReflection governance writes', () => {
  it('stores provenance, publish status, and quality score on learning nodes', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    const reflection = {
      sessionId: 'session-123',
      taskSummary: 'Investigate repeated checkout failures',
      outcomeSummary: 'Worker used stale provider credentials.',
      wentWell: [],
      wentWrong: ['Checkout retries kept using revoked credentials.'],
      likelyCauses: ['Credential rotation was not propagated to the worker runtime.'],
      reusableTactics: ['Verify live worker credentials after secret rotation.'],
      learnings: [
        {
          title: 'Validate rotated credentials in the live worker before retrying',
          confidence: 0.88,
          status: 'published' as const,
          qualityScore: 0.91,
          provenance: {
            rawSessionId: 'raw-session-123',
            reflectionVersion: 'v2',
          },
        },
      ],
      confidence: 0.86,
    };

    await storeReflection(reflection, namespace, { session });

    expect(session.run).toHaveBeenCalledTimes(3);

    const learningQuery = session.run.mock.calls[2]?.[0] as string;
    const learningParams = session.run.mock.calls[2]?.[1] as Record<string, unknown>;

    expect(learningQuery).toContain('l.qualityScore = $qualityScore');
    expect(learningQuery).toContain('l.status = $status');
    expect(learningQuery).toContain('l.rawSessionId = $rawSessionId');
    expect(learningQuery).toContain('l.reflectionVersion = $reflectionVersion');
    expect(learningParams).toMatchObject({
      title: 'Validate rotated credentials in the live worker before retrying',
      qualityScore: 0.91,
      status: 'published',
      rawSessionId: 'raw-session-123',
      reflectionVersion: 'v2',
    });
  });

  it('creates contradiction and suppression metadata edges when instructed', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    const reflection = {
      sessionId: 'session-456',
      taskSummary: 'Diagnose a flaky deployment rollback',
      outcomeSummary: 'A stale rollout note conflicted with the active runbook.',
      wentWell: [],
      wentWrong: ['The agent followed an outdated rollback tactic.'],
      likelyCauses: ['A previous learning stayed published after the process changed.'],
      reusableTactics: ['Suppress contradicted rollout advice immediately.'],
      learnings: [
        {
          title: 'Use blue-green rollback for the current deployment stack',
          confidence: 0.77,
          status: 'suppressed' as const,
          qualityScore: 0.34,
          provenance: {
            rawSessionId: 'raw-session-456',
            reflectionVersion: 'v2',
          },
          suppression: {
            reason: 'Superseded by the canary rollback policy introduced this week.',
          },
          contradiction: {
            learningTitle: 'Use canary rollback for the current deployment stack',
            groupId: 'rollback-policy-2026-03-06',
            reason: 'Canary rollback replaced blue-green for this service.',
          },
        },
      ],
      confidence: 0.7,
    };

    await storeReflection(reflection, namespace, { session });

    expect(session.run).toHaveBeenCalledTimes(5);

    const contradictionQuery = session.run.mock.calls[3]?.[0] as string;
    const contradictionParams = session.run.mock.calls[3]?.[1] as Record<string, unknown>;
    const suppressionQuery = session.run.mock.calls[4]?.[0] as string;
    const suppressionParams = session.run.mock.calls[4]?.[1] as Record<string, unknown>;

    expect(contradictionQuery).toContain('MERGE (l)-[r:CONTRADICTS]->(other)');
    expect(contradictionQuery).toContain('r.groupId = $groupId');
    expect(contradictionParams).toMatchObject({
      relatedLearningTitle: 'Use canary rollback for the current deployment stack',
      groupId: 'rollback-policy-2026-03-06',
      contradictionReason: 'Canary rollback replaced blue-green for this service.',
    });
    expect(contradictionParams.relatedLearningKey).toBeTypeOf('string');

    expect(suppressionQuery).toContain('MERGE (decision:MemoryQualityDecision { decisionKey: $decisionKey })');
    expect(suppressionQuery).toContain('MERGE (decision)-[:SUPPRESSES]->(l)');
    expect(suppressionParams).toMatchObject({
      status: 'suppressed',
      qualityScore: 0.34,
      suppressionReason: 'Superseded by the canary rollback policy introduced this week.',
    });
    expect(suppressionParams.decisionKey).toBeTypeOf('string');
  });
});
