import { describe, expect, it, vi } from 'vitest';
import { vectorSearch } from '../src/lib/retrieval/vector-search.js';

describe('vectorSearch', () => {
  it('returns embedding matches from the same namespace and forwards retrieval filters', async () => {
    const embedQuery = vi.fn().mockResolvedValue([0.12, 0.88]);
    const loadCandidates = vi.fn().mockResolvedValue([
      {
        id: 'learning-1',
        namespaceId: 'namespace-123',
        type: 'failure',
        title: 'Retry Postgres writes after lock timeout',
        summary: 'A bounded retry loop recovered the Postgres migration after a lock timeout.',
        confidence: 0.83,
        qualityScore: 0.91,
        status: 'published',
        retrievalStatus: 'failed',
        toolNames: ['psql'],
        sourceProvenance: [{ sessionId: 'session-1' }],
      },
      {
        id: 'learning-2',
        namespaceId: 'namespace-123',
        type: 'success_pattern',
        title: 'Retry Redis reads after failover',
        summary: 'A Redis recovery that should be excluded from failure-only lookup.',
        confidence: 0.95,
        qualityScore: 0.94,
        status: 'published',
        retrievalStatus: 'success',
        toolNames: ['redis-cli'],
        sourceProvenance: [{ sessionId: 'session-2' }],
      },
    ]);
    const syncCandidates = vi.fn().mockResolvedValue(undefined);
    const search = vi.fn().mockResolvedValue([
      {
        id: 'learning-1',
        namespaceId: 'namespace-123',
        type: 'failure',
        title: 'Retry Postgres writes after lock timeout',
        summary: 'A bounded retry loop recovered the Postgres migration after a lock timeout.',
        confidence: 0.83,
        qualityScore: 0.91,
        status: 'published',
        retrievalStatus: 'failed',
        toolNames: ['psql'],
        sourceProvenance: [{ sessionId: 'session-1' }],
        similarity: 0.97,
      },
    ]);

    const results = await vectorSearch(
      {
        namespaceId: 'namespace-123',
        query: 'postgres lock timeout retry',
        limit: 3,
        filters: {
          statuses: ['failed'],
          toolNames: ['psql'],
        },
      },
      {
        embedQuery,
        loadCandidates,
        store: {
          syncCandidates,
          search,
        },
      }
    );

    expect(embedQuery).toHaveBeenCalledWith('postgres lock timeout retry');
    expect(loadCandidates).toHaveBeenCalledWith({
      namespaceId: 'namespace-123',
      limit: 15,
      filters: {
        statuses: ['failed'],
        toolNames: ['psql'],
      },
    });
    expect(syncCandidates).toHaveBeenCalledWith({
      namespaceId: 'namespace-123',
      candidates: [
        expect.objectContaining({
          id: 'learning-1',
          namespaceId: 'namespace-123',
          retrievalStatus: 'failed',
        }),
      ],
    });
    expect(search).toHaveBeenCalledWith({
      namespaceId: 'namespace-123',
      embedding: [0.12, 0.88],
      limit: 3,
      filters: {
        statuses: ['failed'],
        toolNames: ['psql'],
      },
    });
    expect(results).toEqual([
      expect.objectContaining({
        id: 'learning-1',
        type: 'failure',
        status: 'published',
        qualityScore: 0.91,
        namespaceMatch: 'exact',
        signal: 'failure_pattern',
        semanticSimilarity: 0.97,
        reasons: [
          expect.objectContaining({
            kind: 'semantic_similarity',
            score: 0.97,
          }),
          expect.objectContaining({
            kind: 'provenance_quality',
            score: 0.91,
          }),
        ],
      }),
    ]);
  });

  it('filters stale vector-store hits that do not satisfy failure-only retrieval', async () => {
    const search = vi.fn().mockResolvedValue([
      {
        id: 'failure-1',
        namespaceId: 'namespace-123',
        type: 'failure',
        title: 'Retry Postgres writes after lock timeout',
        summary: 'Recovered the Postgres migration after retrying.',
        confidence: 0.8,
        qualityScore: 0.86,
        status: 'published',
        retrievalStatus: 'failed',
        toolNames: ['psql'],
        sourceProvenance: [],
        similarity: 0.93,
      },
      {
        id: 'success-1',
        namespaceId: 'namespace-123',
        type: 'success_pattern',
        title: 'Retry Redis reads after failover',
        summary: 'Unrelated Redis recovery should not leak into failure lookup.',
        confidence: 0.96,
        qualityScore: 0.94,
        status: 'published',
        retrievalStatus: 'success',
        toolNames: ['redis-cli'],
        sourceProvenance: [],
        similarity: 0.98,
      },
    ]);

    const results = await vectorSearch(
      {
        namespaceId: 'namespace-123',
        query: 'postgres lock timeout retry',
        limit: 2,
        filters: {
          statuses: ['failed'],
          toolNames: [],
        },
      },
      {
        embedQuery: vi.fn().mockResolvedValue([0.12, 0.88]),
        loadCandidates: vi.fn().mockResolvedValue([
          {
            id: 'failure-1',
            namespaceId: 'namespace-123',
            type: 'failure',
            title: 'Retry Postgres writes after lock timeout',
            summary: 'Recovered the Postgres migration after retrying.',
            confidence: 0.8,
            qualityScore: 0.86,
            status: 'published',
            retrievalStatus: 'failed',
            toolNames: ['psql'],
            sourceProvenance: [],
          },
        ]),
        store: {
          syncCandidates: vi.fn().mockResolvedValue(undefined),
          search,
        },
      }
    );

    expect(results.map((result) => result.id)).toEqual(['failure-1']);
  });
});
