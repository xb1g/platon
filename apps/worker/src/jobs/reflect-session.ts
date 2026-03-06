import { llmReflect } from '../lib/llm.js';
import { storeReflection } from '../lib/store-reflection.js';
import type { NamespaceParams } from '../lib/memory-namespace.js';
import type { ReflectionData, StoreReflectionDeps } from '../lib/store-reflection.js';

export type ReflectSessionInput = {
  subscriberId: string;
  agentKind: string;
  agentId: string;
  sessionId: string;
  task: { kind: string; summary: string };
  outcome: { status: string; summary: string };
  tools?: Array<{ name: string; category: string }>;
  events?: Array<{ type: string; summary: string }>;
  artifacts?: Array<{ kind: string; uri: string; summary?: string }>;
  errors?: Array<{ message: string; code?: string; retryable?: boolean }>;
};

export type ReflectSessionDeps = StoreReflectionDeps & {
  reflect?: (data: ReflectSessionInput) => Promise<ReflectionData>;
};

export const reflectSession = async (
  data: ReflectSessionInput,
  deps?: ReflectSessionDeps
): Promise<void> => {
  const namespace: NamespaceParams = {
    subscriberId: data.subscriberId,
    agentKind: data.agentKind,
    agentId: data.agentId,
  };

  const reflection = await (deps?.reflect ?? llmReflect)(data);

  await storeReflection(reflection, namespace, deps);
};
