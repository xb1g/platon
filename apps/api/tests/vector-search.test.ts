import { describe, expect, it, vi } from 'vitest';
import { vectorSearch } from '../src/lib/retrieval/vector-search.js';

describe('vectorSearch', () => {
  it('returns embedding matches from the same namespace', async () => {
    const embedQuery = vi.fn().mockResolvedValue([0.12, 0.88]);
    const loadCandidates = vi.fn().mockResolvedValue([
      {
        id: 'learning-1',
        namespaceId: 'namespace-123',
        type: 'learning',
        title: 'Retry Redis reads after failover',
        summary: 'A bounded retry loop recovered Redis reads after failover.',
        confidence: 0.83,
        qualityScore: 0.91,
        status: 'published',
        sourceProvenance: [{ sessionId: 'session-1' }],
      },
      {
        id: 'learning-2',
        namespaceId: 'namespace-999',
        type: 'learning',
        title: 'Restart the cache worker',
        summary: 'Cross-namespace learning that should not appear.',
        confidence: 0.95,
        qualityScore: 0.94,
        status: 'published',
        sourceProvenance: [{ sessionId: 'session-2' }],
      },
    ]);
    const syncCandidates = vi.fn().mockResolvedValue(undefined);
    const search = vi.fn().mockResolvedValue([
      {
        id: 'learning-1',
        namespaceId: 'namespace-123',
        type: 'learning',
        title: 'Retry Redis reads after failover',
        summary: 'A bounded retry loop recovered Redis reads after failover.',
        confidence: 0.83,
        qualityScore: 0.91,
        status: 'published',
        sourceProvenance: [{ sessionId: 'session-1' }],
        similarity: 0.97,
      },
    ]);

    const results = await vectorSearch(
      {
        namespaceId: 'namespace-123',
        query: 'redis failover retry',
        limit: 3,
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

    expect(embedQuery).toHaveBeenCalledWith('redis failover retry');
    expect(loadCandidates).toHaveBeenCalledWith({
      namespaceId: 'namespace-123',
      limit: 15,
    });
    expect(syncCandidates).toHaveBeenCalledWith({
      namespaceId: 'namespace-123',
      candidates: [
        expect.objectContaining({
          id: 'learning-1',
          namespaceId: 'namespace-123',
        }),
      ],
    });
    expect(search).toHaveBeenCalledWith({
      namespaceId: 'namespace-123',
      embedding: [0.12, 0.88],
      limit: 3,
    });
    expect(results).toEqual([
      expect.objectContaining({
        id: 'learning-1',
        status: 'published',
        qualityScore: 0.91,
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
});
