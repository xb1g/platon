import type { RetrievalFilters, RetrievalRequest, RetrievalResult } from '@memory/shared';
import type { Session as Neo4jSession } from 'neo4j-driver';
import { embedText } from './embed.js';
import { vectorStore, type VectorStore, type VectorStoreCandidate } from './vector-store.js';

export type VectorSearchInput = Pick<RetrievalRequest, 'query' | 'limit' | 'filters'> & {
  namespaceId: string;
};

type LoadCandidatesArgs = {
  namespaceId: string;
  limit: number;
  filters?: RetrievalFilters;
};

type VectorSearchDeps = {
  embedQuery?: (text: string) => Promise<number[]>;
  loadCandidates?: (args: LoadCandidatesArgs) => Promise<VectorStoreCandidate[]>;
  logger?: Pick<Console, 'warn'>;
  session?: Neo4jSession;
  store?: VectorStore;
};

const DEFAULT_CANDIDATE_MULTIPLIER = 5;

const matchesFilters = (
  candidate: Pick<VectorStoreCandidate, 'retrievalStatus' | 'toolNames'>,
  filters?: RetrievalFilters
) => {
  const statuses = filters?.statuses ?? [];
  const toolNames = filters?.toolNames ?? [];
  const statusAllowed =
    statuses.length === 0 ||
    (typeof candidate.retrievalStatus === 'string' &&
      (statuses as readonly string[]).includes(candidate.retrievalStatus));
  const toolAllowed =
    toolNames.length === 0 ||
    (candidate.toolNames ?? []).some((toolName) => toolNames.includes(toolName));

  return statusAllowed && toolAllowed;
};

const loadVectorCandidates = async (
  { namespaceId, limit, filters }: LoadCandidatesArgs,
  session?: Neo4jSession
): Promise<VectorStoreCandidate[]> => {
  if (!session) {
    return [];
  }

  const statusFilter = filters?.statuses?.length
    ? 'AND s.status IN $statuses'
    : '';

  const toolFilter = filters?.toolNames?.length
    ? 'AND EXISTS { (s)-[:USED_TOOL]->(t:Tool) WHERE t.name IN $toolNames }'
    : '';

  const result = await session.run(
    `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_SESSION]->(s:Session)-[:PRODUCED]->(l:Learning)
     WHERE coalesce(l.status, 'published') = 'published'
       ${statusFilter}
       ${toolFilter}
     OPTIONAL MATCH (s)-[:USED_TOOL]->(tool:Tool)
     WITH l, s, collect(DISTINCT tool.name) AS toolNames
     RETURN
       l.id AS id,
       $namespaceId AS namespaceId,
       CASE s.status
         WHEN 'failed' THEN 'failure'
         WHEN 'success' THEN 'success_pattern'
         ELSE 'learning'
       END AS type,
       l.title AS title,
       coalesce(l.summary, l.title) AS summary,
       coalesce(l.confidence, 0.5) AS confidence,
       coalesce(l.qualityScore, l.confidence, 0.5) AS qualityScore,
       coalesce(l.status, 'published') AS status,
       s.status AS retrievalStatus,
       toolNames AS toolNames,
       [] AS sourceProvenance
     ORDER BY coalesce(l.qualityScore, l.confidence, 0.5) DESC,
              coalesce(l.updatedAt, l.createdAt) DESC
     LIMIT $limit`,
    {
      namespaceId,
      limit,
      statuses: filters?.statuses ?? [],
      toolNames: filters?.toolNames ?? [],
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
    retrievalStatus: (record.get('retrievalStatus') as string | null) ?? undefined,
    toolNames: Array.isArray(record.get('toolNames'))
      ? (record.get('toolNames') as unknown[]).filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      : [],
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
): Promise<
  (RetrievalResult & {
    namespaceMatch: 'exact';
    signal: 'failure_pattern' | 'semantic';
    semanticSimilarity: number;
  })[]
> => {
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
      filters: input.filters,
    }))
      .filter((candidate) => candidate.namespaceId === input.namespaceId)
      .filter((candidate) => matchesFilters(candidate, input.filters));

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
      filters: input.filters,
    });

    return hits
      .filter((hit) => matchesFilters(hit, input.filters))
      .map(({ similarity, retrievalStatus, toolNames, ...hit }) => ({
        ...hit,
        namespaceMatch: 'exact' as const,
        signal: hit.type === 'failure' ? 'failure_pattern' as const : 'semantic' as const,
        semanticSimilarity: Number(similarity.toFixed(4)),
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
