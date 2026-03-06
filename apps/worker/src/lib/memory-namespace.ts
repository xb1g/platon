import { createHash } from 'node:crypto';

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
