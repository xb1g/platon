import { describe, it, expect, vi } from 'vitest';
import neo4j from 'neo4j-driver';
import { graphSearch } from '../src/lib/retrieval/graph-search.js';
import { rankResults } from '../src/lib/retrieval/rank.js';
import type { RetrievalResult } from '@memory/shared';

type RankTestResult = RetrievalResult & {
  createdAt?: string;
  namespaceMatch?: 'exact' | 'cross_namespace';
  signal?: 'failure_pattern' | 'semantic';
  semanticSimilarity?: number;
};

const makeResult = (
  overrides: Partial<RankTestResult> & { id: string }
): RankTestResult => ({
  type: 'learning',
  title: 'Test result',
  summary: 'Test summary',
  confidence: 0.5,
  reasons: [],
  sourceProvenance: [],
  namespaceMatch: 'exact',
  signal: 'semantic',
  ...overrides,
});

describe('Retrieval Ranking', () => {
  it('graph search scopes traversal to MemoryNamespace and emits ranking metadata', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({
        records: [
          {
            get: (key: string) => {
              if (key === 'result') {
                return {
                  id: 'learning-1',
                  type: 'failure',
                  title: 'Retry Redis reads after failover',
                  summary: 'A previous Redis failover recovered after a bounded retry loop.',
                  confidence: 0.83,
                  namespaceMatch: 'exact',
                  signal: 'failure_pattern',
                };
              }

              if (key === 'createdAt') {
                return '2026-03-05T10:00:00.000Z';
              }

              return undefined;
            },
          },
        ],
      }),
    } as any;

    const results = await graphSearch(
      {
        namespaceId: 'namespace-123',
        query: 'redis failover',
        limit: 3,
        filters: {
          statuses: ['failed'],
          toolNames: ['redis-cli'],
        },
      },
      { session }
    );

    expect(session.run).toHaveBeenCalledOnce();
    const [query, params] = session.run.mock.calls[0];
    expect(query).toContain('MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })');
    expect(query).toContain('s.status IN $statuses');
    expect(query).toContain('t.name IN $toolNames');
    expect(params).toMatchObject({
      namespaceId: 'namespace-123',
      query: 'redis failover',
      statuses: ['failed'],
      toolNames: ['redis-cli'],
    });
    expect(neo4j.isInt(params.limit)).toBe(true);
    expect(params.limit.toNumber()).toBe(3);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'learning-1',
      type: 'failure',
      confidence: 0.83,
    });
    expect(results[0]).toHaveProperty('createdAt', '2026-03-05T10:00:00.000Z');
    expect(results[0]).toHaveProperty('namespaceMatch', 'exact');
    expect(results[0]).toHaveProperty('signal', 'failure_pattern');
  });

  it('status filter in graph search is applied at the outer session level, not inside OPTIONAL MATCH', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    await graphSearch(
      {
        namespaceId: 'ns-123',
        query: 'postgres migration',
        limit: 5,
        filters: { statuses: ['failed'], toolNames: [] },
      },
      { session }
    );

    const [query] = session.run.mock.calls[0];
    const outerMatchIndex = query.indexOf('MATCH (ns:MemoryNamespace');
    const optionalMatchIndex = query.indexOf('OPTIONAL MATCH');
    const statusFilterIndex = query.indexOf('s.status IN $statuses');

    // The status filter must appear in the outer MATCH WHERE, before OPTIONAL MATCH
    expect(statusFilterIndex).toBeGreaterThan(outerMatchIndex);
    expect(statusFilterIndex).toBeLessThan(optionalMatchIndex);
  });

  it('tool filter in graph search is applied at the outer session level, not inside OPTIONAL MATCH', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    await graphSearch(
      {
        namespaceId: 'ns-123',
        query: 'postgres migration',
        limit: 5,
        filters: { statuses: [], toolNames: ['psql'] },
      },
      { session }
    );

    const [query] = session.run.mock.calls[0];
    const optionalMatchIndex = query.indexOf('OPTIONAL MATCH');
    const toolFilterIndex = query.indexOf('t.name IN $toolNames');

    // The tool filter must appear before OPTIONAL MATCH
    expect(toolFilterIndex).toBeLessThan(optionalMatchIndex);
  });

  it('combined status+tool filters both appear at the outer session level before OPTIONAL MATCH', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    await graphSearch(
      {
        namespaceId: 'ns-123',
        query: 'postgres migration',
        limit: 5,
        filters: { statuses: ['failed'], toolNames: ['psql'] },
      },
      { session }
    );

    const [query] = session.run.mock.calls[0];
    const optionalMatchIndex = query.indexOf('OPTIONAL MATCH');

    expect(query.indexOf('s.status IN $statuses')).toBeLessThan(optionalMatchIndex);
    expect(query.indexOf('t.name IN $toolNames')).toBeLessThan(optionalMatchIndex);
  });

  it('graph search with no filters emits no WHERE clause before OPTIONAL MATCH', async () => {
    const session = {
      run: vi.fn().mockResolvedValue({ records: [] }),
    } as any;

    await graphSearch(
      { namespaceId: 'ns-123', query: 'redis', limit: 5 },
      { session }
    );

    const [query] = session.run.mock.calls[0];
    const outerMatchEnd = query.indexOf('OPTIONAL MATCH');
    const segmentBeforeOptional = query.slice(0, outerMatchEnd);

    // No WHERE clause should appear before OPTIONAL MATCH when no filters are provided
    expect(segmentBeforeOptional).not.toContain('WHERE');
  });

  it('exact namespace graph match beats higher-confidence cross-namespace vector match', () => {
    const graphResults: RankTestResult[] = [
      makeResult({ id: 'graph-1', type: 'learning', confidence: 0.78, namespaceMatch: 'exact' }),
    ];

    const vectorResults: RankTestResult[] = [
      makeResult({
        id: 'vector-1',
        type: 'learning',
        confidence: 0.86,
        namespaceMatch: 'cross_namespace',
      }),
    ];

    const ranked = rankResults(graphResults, vectorResults);

    expect(ranked[0].id).toBe('graph-1');
  });

  it('failure-pattern hits beat generic semantic matches', () => {
    const graphResults: RetrievalResult[] = [
      makeResult({ id: 'failure-1', type: 'failure', confidence: 0.7 }),
    ];

    const vectorResults: RetrievalResult[] = [
      makeResult({ id: 'session-1', type: 'session', confidence: 0.7 }),
    ];

    const ranked = rankResults(graphResults, vectorResults);

    expect(ranked[0].id).toBe('failure-1');
  });

  it('combines vector and graph results before ranking', () => {
    const graphResults: RankTestResult[] = [
      makeResult({
        id: 'graph-1',
        type: 'failure',
        confidence: 0.72,
        namespaceMatch: 'exact',
        signal: 'failure_pattern',
      }),
    ];

    const vectorResults: RankTestResult[] = [
      makeResult({
        id: 'vector-1',
        type: 'learning',
        confidence: 0.81,
        qualityScore: 0.93,
        namespaceMatch: 'exact',
        signal: 'semantic',
        semanticSimilarity: 0.96,
      }),
    ];

    const ranked = rankResults(graphResults, vectorResults);

    expect(ranked.map((result) => result.id)).toEqual(['graph-1', 'vector-1']);
  });

  it('keeps exact failure matches above weak semantic vector near-misses in the same namespace', () => {
    const graphResults: RankTestResult[] = [
      makeResult({
        id: 'postgres-failure',
        type: 'failure',
        title: 'Postgres billing-ledger migration lock timeout',
        confidence: 0.72,
        namespaceMatch: 'exact',
        signal: 'failure_pattern',
      }),
    ];

    const vectorResults: RankTestResult[] = [
      makeResult({
        id: 'redis-success',
        type: 'success_pattern',
        title: 'Redis failover recovery',
        confidence: 0.98,
        qualityScore: 0.98,
        namespaceMatch: 'exact',
        signal: 'semantic',
        semanticSimilarity: 0.16,
      }),
    ];

    const ranked = rankResults(graphResults, vectorResults);

    expect(ranked.map((result) => result.id)).toEqual(['postgres-failure', 'redis-success']);
  });

  it('fresh learnings outrank stale near-ties once freshness is considered', () => {
    const graphResults: RankTestResult[] = [
      makeResult({
        id: 'fresh-learning',
        type: 'learning',
        confidence: 0.79,
        createdAt: '2026-03-05T12:00:00.000Z',
      }),
      makeResult({
        id: 'stale-learning',
        type: 'learning',
        confidence: 0.84,
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    ];

    const ranked = rankResults(graphResults, []);

    expect(ranked[0].id).toBe('fresh-learning');
    expect(ranked[1].id).toBe('stale-learning');
  });

  it('deduplicates results by id keeping higher score', () => {
    const graphResults: RetrievalResult[] = [
      makeResult({ id: 'same-1', type: 'learning', confidence: 0.9 }),
    ];

    const vectorResults: RetrievalResult[] = [
      makeResult({ id: 'same-1', type: 'learning', confidence: 0.5 }),
    ];

    const ranked = rankResults(graphResults, vectorResults);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('same-1');
  });

  it('returns empty array when no results provided', () => {
    const ranked = rankResults([], []);
    expect(ranked).toEqual([]);
  });

  it('ranks success patterns above plain sessions', () => {
    const graphResults: RetrievalResult[] = [
      makeResult({ id: 'session-1', type: 'session', confidence: 0.7 }),
      makeResult({ id: 'pattern-1', type: 'success_pattern', confidence: 0.7 }),
    ];

    const ranked = rankResults(graphResults, []);

    expect(ranked[0].id).toBe('pattern-1');
  });

  it('boosts historically useful memories and emits usefulness-aware ranking reasons', () => {
    const graphResults: RetrievalResult[] = [
      makeResult({
        id: 'useful-memory',
        type: 'learning',
        confidence: 0.7,
        usefulness: {
          usefulCount: 4,
          harmfulCount: 0,
          score: 1,
        },
      }),
      makeResult({
        id: 'neutral-memory',
        type: 'learning',
        confidence: 0.7,
        usefulness: {
          usefulCount: 0,
          harmfulCount: 0,
          score: 0,
        },
      }),
    ];

    const ranked = rankResults(graphResults, []);

    expect(ranked[0].id).toBe('useful-memory');
    expect(ranked[0].reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'usefulness',
          summary: expect.stringContaining('useful'),
        }),
      ])
    );
  });

  it('graph-source success hit outranks vector-only failure when graph hit is exact-match relevant', () => {
    // Scenario from production issue: "redis failover" query
    // Redis success memory appears in graph results (CONTAINS match)
    // Postgres failure appears ONLY in vector results (no text match for redis query)
    const graphResults: RankTestResult[] = [
      makeResult({
        id: 'redis-success',
        type: 'success_pattern',
        title: 'Redis failover recovery',
        confidence: 0.7,
        namespaceMatch: 'exact',
        signal: 'semantic',
      }),
    ];

    const vectorResults: RankTestResult[] = [
      makeResult({
        id: 'postgres-failure',
        type: 'failure',
        title: 'Postgres billing-ledger migration lock timeout',
        confidence: 0.8,
        qualityScore: 0.85,
        namespaceMatch: 'exact',
        signal: 'failure_pattern',
        semanticSimilarity: 0.48,
      }),
    ];

    const ranked = rankResults(graphResults, vectorResults);

    // Redis success (graph hit = exact text match) should beat Postgres failure (vector-only, low similarity)
    expect(ranked[0].id).toBe('redis-success');
  });

  it('high-similarity vector success outranks low-similarity vector failure in unfiltered retrieval', () => {
    // When both are vector-only results, high semantic similarity should dominate over failure type boost
    const graphResults: RankTestResult[] = [];

    const vectorResults: RankTestResult[] = [
      makeResult({
        id: 'redis-success',
        type: 'success_pattern',
        title: 'Redis failover recovery',
        confidence: 0.7,
        namespaceMatch: 'exact',
        signal: 'semantic',
        semanticSimilarity: 0.85,
      }),
      makeResult({
        id: 'postgres-failure',
        type: 'failure',
        title: 'Postgres billing-ledger migration lock timeout',
        confidence: 0.8,
        qualityScore: 0.85,
        namespaceMatch: 'exact',
        signal: 'failure_pattern',
        semanticSimilarity: 0.42,
      }),
    ];

    const ranked = rankResults(graphResults, vectorResults);

    // High semantic similarity (0.85) should beat low-sim failure (0.42) despite failure type boost
    expect(ranked[0].id).toBe('redis-success');
  });
});
