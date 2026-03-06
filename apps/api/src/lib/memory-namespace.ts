import { createHash } from 'node:crypto';
import type { Session as Neo4jSession } from 'neo4j-driver';

export type NamespaceParams = {
  subscriberId: string;
  agentKind: string;
  agentId: string;
};

export type ResolvedNamespace = NamespaceParams & {
  namespaceId: string;
};

export const resolveNamespace = (params: NamespaceParams): ResolvedNamespace => {
  const namespaceId = createHash('sha256')
    .update(`${params.subscriberId}::${params.agentKind}::${params.agentId}`)
    .digest('hex')
    .slice(0, 32);

  return {
    ...params,
    namespaceId,
  };
};

export const ensureNamespaceNode = async (
  session: Neo4jSession,
  params: NamespaceParams
): Promise<ResolvedNamespace> => {
  const ns = resolveNamespace(params);

  await session.run(
    `MERGE (n:MemoryNamespace { namespaceId: $namespaceId })
     ON CREATE SET n.subscriberId = $subscriberId,
                   n.agentKind = $agentKind,
                   n.agentId = $agentId,
                   n.createdAt = datetime()
     ON MATCH SET  n.lastAccessedAt = datetime()`,
    ns
  );

  return ns;
};
