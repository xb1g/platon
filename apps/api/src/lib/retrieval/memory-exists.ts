import type { Session as Neo4jSession } from 'neo4j-driver';

export const memoryExistsInNamespace = async (
  params: {
    namespaceId: string;
    memoryId: string;
  },
  deps: {
    session: Neo4jSession;
  }
): Promise<boolean> => {
  const result = await deps.session.run(
    `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })
     OPTIONAL MATCH (ns)-[:HAS_LEARNING]->(l:Learning { id: $memoryId })
     OPTIONAL MATCH (ns)-[:HAS_SESSION]->(s:Session { sessionId: $memoryId })
     RETURN CASE WHEN l IS NULL AND s IS NULL THEN false ELSE true END AS exists`,
    {
      namespaceId: params.namespaceId,
      memoryId: params.memoryId,
    }
  );

  return result.records[0]?.get('exists') === true;
};
