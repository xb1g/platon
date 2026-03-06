import { describe, expect, it, vi } from 'vitest';
import { llmReflect } from '../src/lib/llm.js';

const baseSession = {
  agentId: 'agent-123',
  agentKind: 'support-agent',
  sessionId: 'session-123',
  task: {
    kind: 'incident',
    summary: 'Investigate repeated checkout failures',
  },
  outcome: {
    status: 'failed' as const,
    summary: 'The checkout flow failed after the payment provider returned 401 errors.',
  },
  errors: [
    {
      message: 'Stripe API returned 401 for merchant account lookup.',
      code: 'STRIPE_401',
      retryable: false,
    },
  ],
  events: [
    {
      type: 'tool',
      summary: 'Compared the failing request headers against the known-good production baseline.',
    },
  ],
  tools: [
    {
      name: 'stripe-cli',
      category: 'debug',
    },
  ],
  artifacts: [],
};

describe('llmReflect', () => {
  it('returns schema-valid reflection output from the model', async () => {
    const invokeModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        wentWell: ['Collected enough request context to isolate the auth boundary quickly.'],
        wentWrong: ['The worker called Stripe with stale credentials.'],
        likelyCauses: ['Credential rotation did not update the worker runtime environment.'],
        reusableTactics: ['Verify rotated secrets from the running worker before retrying payment calls.'],
        learnings: [
          {
            title: 'Validate rotated payment credentials in the live worker',
            confidence: 0.88,
          },
        ],
        confidence: 0.86,
      })
    );

    await expect(llmReflect(baseSession, { invokeModel })).resolves.toEqual({
      sessionId: 'session-123',
      taskSummary: 'Investigate repeated checkout failures',
      outcomeSummary: 'The checkout flow failed after the payment provider returned 401 errors.',
      wentWell: ['Collected enough request context to isolate the auth boundary quickly.'],
      wentWrong: ['The worker called Stripe with stale credentials.'],
      likelyCauses: ['Credential rotation did not update the worker runtime environment.'],
      reusableTactics: ['Verify rotated secrets from the running worker before retrying payment calls.'],
      learnings: [
        {
          title: 'Validate rotated payment credentials in the live worker',
          confidence: 0.88,
        },
      ],
      confidence: 0.86,
    });

    expect(invokeModel).toHaveBeenCalledTimes(1);
  });

  it('retries on malformed JSON and succeeds when a later attempt is valid', async () => {
    const invokeModel = vi
      .fn()
      .mockResolvedValueOnce('{')
      .mockResolvedValueOnce(
        JSON.stringify({
          wentWell: ['Captured precise error evidence from the provider logs.'],
          wentWrong: ['The worker retried with an already-revoked token.'],
          likelyCauses: ['Token rotation and worker rollout were not sequenced together.'],
          reusableTactics: ['Roll credentials and worker deploys as one change set.'],
          learnings: [{ title: 'Pair token rotation with worker rollout', confidence: 0.8 }],
          confidence: 0.79,
        })
      );

    const reflection = await llmReflect(baseSession, {
      invokeModel,
      maxAttempts: 2,
    });

    expect(reflection.learnings).toEqual([
      { title: 'Pair token rotation with worker rollout', confidence: 0.8 },
    ]);
    expect(invokeModel).toHaveBeenCalledTimes(2);
  });

  it('fails closed after retry budget is exhausted on malformed JSON', async () => {
    const invokeModel = vi.fn().mockResolvedValue('{"wentWell":');

    await expect(
      llmReflect(baseSession, {
        invokeModel,
        maxAttempts: 2,
      })
    ).rejects.toThrow('Reflection model returned invalid structured output after 2 attempts.');

    expect(invokeModel).toHaveBeenCalledTimes(2);
  });

  it('redacts secrets before sending content to the model', async () => {
    const invokeModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        wentWell: ['Collected enough context to understand the failure.'],
        wentWrong: ['Credentials leaked into runtime logs.'],
        likelyCauses: ['The task output included raw environment configuration.'],
        reusableTactics: ['Redact secrets before forwarding session content to any model.'],
        learnings: [{ title: 'Mask credentials in model inputs', confidence: 0.91 }],
        confidence: 0.9,
      })
    );

    await llmReflect(
      {
        ...baseSession,
        inputContextSummary:
          'Customer escalation included OPENAI_API_KEY=sk-live-123456789 and password=hunter2.',
        outcome: {
          status: 'failed',
          summary:
            'Bearer token Bearer super-secret-token appeared in the logs near postgres://user:pass@db.internal:5432/memory.',
        },
        errors: [
          {
            message: 'Authorization failed with api_key=shhh-keep-me-hidden.',
          },
        ],
      },
      { invokeModel }
    );

    const prompt = invokeModel.mock.calls[0]?.[0] as string;

    expect(prompt).toContain('[REDACTED]');
    expect(prompt).not.toContain('sk-live-123456789');
    expect(prompt).not.toContain('hunter2');
    expect(prompt).not.toContain('super-secret-token');
    expect(prompt).not.toContain('postgres://user:pass@db.internal:5432/memory');
    expect(prompt).not.toContain('shhh-keep-me-hidden');
  });
});
