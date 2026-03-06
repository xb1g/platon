import type { RetrievalRequest, RetrievalResult } from '@memory/shared';
import type { Session as Neo4jSession } from 'neo4j-driver';
import { embedText } from './embed.js';
import { vectorStore, type VectorStore, type VectorStoreCandidate } from './vector-store.js';

export type VectorSearchInput = Pick<RetrievalRequest, 'query' | 'limit'> & {
  namespaceId: string;
};

type LoadCandidatesArgs = {
  namespaceId: string;
  limit: number;
};

type VectorSearchDeps = {
  embedQuery?: (text: string) => Promise<number[]>;
  loadCandidates?: (args: LoadCandidatesArgs) => Promise<VectorStoreCandidate[]>;
  logger?: Pick<Console, 'warn'>;
  session?: Neo4jSession;
  store?: VectorStore;
};

const DEFAULT_CANDIDATE_MULTIPLIER = 5;

const loadVectorCandidates = async (
  { namespaceId, limit }: LoadCandidatesArgs,
  session?: Neo4jSession
): Promise<VectorStoreCandidate[]> => {
  if (!session) {
    return [];
  }

  const result = await session.run(
    `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_LEARNING]->(l:Learning)
     WHERE coalesce(l.status, 'published') = 'published'
     RETURN
       l.id AS id,
       $namespaceId AS namespaceId,
       'learning' AS type,
       l.title AS title,
       coalesce(l.summary, l.title) AS summary,
       coalesce(l.confidence, 0.5) AS confidence,
       coalesce(l.qualityScore, l.confidence, 0.5) AS qualityScore,
       coalesce(l.status, 'published') AS status,
       [] AS sourceProvenance
     ORDER BY coalesce(l.qualityScore, l.confidence, 0.5) DESC,
              coalesce(l.updatedAt, l.createdAt) DESC
     LIMIT $limit`,
    {
      namespaceId,
      limit,
    }
  );

  return result.records.map((record): VectorStoreCandidate => ({
    id: record.get('id') as string,
    namespaceId: record.get('namespaceId') as string,
    type: record.get('type') as RetrievalResult['type'],
    title: record.get('title') as string,
    summary: record.get('summary') as string,
    confidence: Number(record.get('confidence') ?? 0.5),
    qualityScore: Number(record.get('qualityScore') ?? 0.5),
    status: record.get('status') as RetrievalResult['status'],
    sourceProvenance: [],
    reasons: [],
  }));
};

const buildReasons = (
  similarity: number,
  qualityScore: number | undefined
): RetrievalResult['reasons'] => [
  {
    kind: 'semantic_similarity',
    summary: 'Embedding similarity matched a governed memory in the current namespace.',
    score: Number(similarity.toFixed(4)),
  },
  {
    kind: 'provenance_quality',
    summary: 'Memory passed governance checks before publication.',
    score: Number((qualityScore ?? 0.5).toFixed(4)),
  },
];

export const vectorSearch = async (
  input: VectorSearchInput,
  deps?: VectorSearchDeps
): Promise<RetrievalResult[]> => {
  const embedQuery = deps?.embedQuery ?? embedText;
  const store = deps?.store ?? vectorStore;
  const loadCandidates =
    deps?.loadCandidates ??
    ((args: LoadCandidatesArgs) => loadVectorCandidates(args, deps?.session));

  try {
    const embedding = await embedQuery(input.query);
    const candidates = (await loadCandidates({
      namespaceId: input.namespaceId,
      limit: input.limit * DEFAULT_CANDIDATE_MULTIPLIER,
    })).filter((candidate) => candidate.namespaceId === input.namespaceId);

    if (candidates.length === 0) {
      return [];
    }

    await store.syncCandidates({
      namespaceId: input.namespaceId,
      candidates,
    });

    const hits = await store.search({
      namespaceId: input.namespaceId,
      embedding,
      limit: input.limit,
    });

    return hits.map(({ similarity, ...hit }): RetrievalResult => ({
      ...hit,
      reasons: buildReasons(similarity, hit.qualityScore),
    }));
  } catch (error) {
    (deps?.logger ?? console).warn(
      `Vector retrieval unavailable for namespace ${input.namespaceId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
};
