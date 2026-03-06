import { llmReflect } from '../lib/llm.js';
import { storeReflection } from '../lib/store-reflection.js';
import { sessionStoreStatus } from '../lib/session-store.js';
import type { NamespaceParams } from '../lib/memory-namespace.js';
import type { ReflectionData, StoreReflectionDeps } from '../lib/store-reflection.js';

export type ReflectSessionInput = {
  subscriberId: string;
  agentKind: string;
  agentId: string;
  sessionId: string;
  task: { kind: string; summary: string };
  outcome: { status: string; summary: string };
  rawSessionId?: number;
  tools?: Array<{ name: string; category: string }>;
  events?: Array<{ type: string; summary: string }>;
  artifacts?: Array<{ kind: string; uri: string; summary?: string }>;
  errors?: Array<{ message: string; code?: string; retryable?: boolean }>;
};

export type SessionStoreStatus = {
  markReflectionProcessing: (rawSessionId: number) => Promise<void>;
  markReflectionCompleted: (rawSessionId: number) => Promise<void>;
  markReflectionFailed: (rawSessionId: number, error: string) => Promise<void>;
};

export type ReflectSessionDeps = StoreReflectionDeps & {
  reflect?: (data: ReflectSessionInput) => Promise<ReflectionData>;
  sessionStore?: SessionStoreStatus;
};

export const reflectSession = async (
  data: ReflectSessionInput,
  deps?: ReflectSessionDeps
): Promise<void> => {
  const { rawSessionId } = data;
  const namespace: NamespaceParams = {
    subscriberId: data.subscriberId,
    agentKind: data.agentKind,
    agentId: data.agentId,
  };
  const sessionStore = deps?.sessionStore ?? sessionStoreStatus;

  if (rawSessionId != null) {
    await sessionStore.markReflectionProcessing(rawSessionId);
  }

  try {
    const reflection = await (deps?.reflect ?? llmReflect)(data);

    await storeReflection(reflection, namespace, deps);

    if (rawSessionId != null) {
      await sessionStore.markReflectionCompleted(rawSessionId);
    }
  } catch (err) {
    if (rawSessionId != null) {
      await sessionStore.markReflectionFailed(rawSessionId, err instanceof Error ? err.message : String(err));
    }
    throw err;
  }
};
