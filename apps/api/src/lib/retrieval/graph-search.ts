import neo4j, { type Session as Neo4jSession } from 'neo4j-driver';
import type { RetrievalResult } from '@memory/shared';

export type GraphSearchParams = {
  namespaceId: string;
  query: string;
  limit: number;
  filters?: {
    statuses?: string[];
    toolNames?: string[];
  };
};

export type GraphSearchDependencies = {
  session: Neo4jSession;
};

type GraphSearchResult = RetrievalResult & {
  createdAt?: string;
  namespaceMatch?: 'exact' | 'cross_namespace';
  signal?: 'failure_pattern' | 'semantic';
};

export const graphSearch = async (
  params: GraphSearchParams,
  deps?: GraphSearchDependencies
): Promise<RetrievalResult[]> => {
  if (!deps?.session) {
    return [];
  }

  const sessionFilterParts: string[] = [];
  if (params.filters?.statuses?.length) {
    sessionFilterParts.push('s.status IN $statuses');
  }
  if (params.filters?.toolNames?.length) {
    sessionFilterParts.push(
      'EXISTS { (s)-[:USED_TOOL]->(t:Tool) WHERE t.name IN $toolNames }'
    );
  }
  const sessionWhereClause =
    sessionFilterParts.length > 0
      ? `WHERE ${sessionFilterParts.join(' AND ')}`
      : '';

  const result = await deps.session.run(
    `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_SESSION]->(s:Session)
     ${sessionWhereClause}
     OPTIONAL MATCH (s)-[:PRODUCED]->(l:Learning)
     WHERE (l.title CONTAINS $query OR s.taskSummary CONTAINS $query)
       AND (l IS NULL OR coalesce(l.status, 'published') = 'published')
     WITH l, s,
       CASE WHEN l IS NOT NULL
         THEN {
           id: l.id,
           type: CASE s.status WHEN 'failed' THEN 'failure' ELSE 'learning' END,
           title: l.title,
           summary: coalesce(l.summary, l.title),
            confidence: coalesce(l.confidence, s.confidence, 0.5),
           status: coalesce(l.status, 'published'),
           qualityScore: coalesce(l.qualityScore, l.confidence, s.confidence, 0.5),
           namespaceMatch: 'exact',
           signal: CASE s.status WHEN 'failed' THEN 'failure_pattern' ELSE 'semantic' END
         }
         ELSE {
           id: s.sessionId,
           type: CASE s.status WHEN 'failed' THEN 'failure' WHEN 'success' THEN 'success_pattern' ELSE 'session' END,
           title: s.taskSummary,
           summary: s.outcomeSummary,
           confidence: coalesce(s.confidence, 0.5),
           namespaceMatch: 'exact',
           signal: CASE s.status WHEN 'failed' THEN 'failure_pattern' ELSE 'semantic' END
         }
       END AS result,
       toString(coalesce(l.createdAt, s.createdAt)) AS createdAt
     WHERE result.title IS NOT NULL
     RETURN DISTINCT result, createdAt
     ORDER BY result.confidence DESC, createdAt DESC
     LIMIT $limit`,
    {
      namespaceId: params.namespaceId,
      query: params.query,
      limit: neo4j.int(params.limit),
      statuses: params.filters?.statuses ?? [],
      toolNames: params.filters?.toolNames ?? [],
    }
  );

  return result.records.map((record: any): GraphSearchResult => {
    const r = record.get('result');
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      summary: r.summary,
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
      status: r.status ?? undefined,
      qualityScore: typeof r.qualityScore === 'number' ? r.qualityScore : undefined,
      reasons: [],
      sourceProvenance: [],
      createdAt: record.get('createdAt') ?? undefined,
      namespaceMatch: r.namespaceMatch ?? 'exact',
      signal: r.signal ?? 'semantic',
    };
  });
};
