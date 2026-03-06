import { describe, expect, it } from 'vitest';
import { governMemory } from '../src/jobs/govern-memory.js';

describe('governMemory', () => {
  it('applies governance decisions to reflected learnings before storage', () => {
    const reflection = governMemory({
      sessionId: 'session-123',
      taskSummary: 'Investigate Redis failover retries',
      outcomeSummary: 'Recovered after validating credentials and retrying reads.',
      wentWell: [],
      wentWrong: ['Initial retries used stale credentials.'],
      likelyCauses: ['Credential rotation did not propagate.'],
      reusableTactics: ['Validate rotated credentials before retrying the worker.'],
      learnings: [
        {
          title: 'Validate rotated Redis credentials in the worker before retrying cache warmup',
          confidence: 0.9,
        },
        {
          title: 'Be more careful next time',
          confidence: 0.8,
        },
      ],
      confidence: 0.88,
    });

    expect(reflection.learnings).toEqual([
      expect.objectContaining({
        title: 'Validate rotated Redis credentials in the worker before retrying cache warmup',
        status: 'published',
        qualityScore: expect.any(Number),
        provenance: expect.objectContaining({
          reflectionVersion: 'v2',
        }),
      }),
      expect.objectContaining({
        title: 'Be more careful next time',
        status: 'suppressed',
        suppression: {
          reason: 'low_specificity',
        },
      }),
    ]);
  });
});
