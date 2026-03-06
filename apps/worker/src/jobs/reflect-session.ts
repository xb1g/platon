import { llmReflect } from '../lib/llm.js';
import {
  getRawSessionById,
  sessionStoreStatus,
  type RawSessionLookup,
  type StoredSessionPayload,
} from '../lib/session-store.js';
import { storeReflection } from '../lib/store-reflection.js';
import type { NamespaceParams } from '../lib/memory-namespace.js';
import type { ReflectionData, StoreReflectionDeps } from '../lib/store-reflection.js';
import { withRawSessionProvenance } from '../lib/store-memory-governance.js';
import { governMemory } from './govern-memory.js';

export type DirectReflectSessionInput = StoredSessionPayload & {
  subscriberId: string;
  rawSessionId?: string;
};

export type StoredReflectSessionInput = RawSessionLookup & {
  rawSessionId: string;
};

export type ReflectSessionInput = DirectReflectSessionInput | StoredReflectSessionInput;

export type SessionStoreStatus = {
  markReflectionProcessing: (rawSessionId: string) => Promise<void>;
  markReflectionCompleted: (rawSessionId: string) => Promise<void>;
  markReflectionFailed: (rawSessionId: string, error: string) => Promise<void>;
};

export type ReflectSessionDeps = StoreReflectionDeps & {
  reflect?: (data: StoredSessionPayload) => Promise<ReflectionData>;
  loadRawSession?: (lookup: RawSessionLookup) => Promise<StoredSessionPayload>;
  sessionStore?: SessionStoreStatus;
};

const isStoredSessionInput = (data: ReflectSessionInput): data is StoredReflectSessionInput =>
  !('task' in data);

const hydrateSession = async (
  data: ReflectSessionInput,
  deps?: ReflectSessionDeps
): Promise<StoredSessionPayload> => {
  if (isStoredSessionInput(data)) {
    return (deps?.loadRawSession ?? getRawSessionById)(data);
  }

  return data;
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
    const session = await hydrateSession(data, deps);
    const reflection = withRawSessionProvenance(
      deps?.reflect ? await deps.reflect(session) : await llmReflect(session),
      rawSessionId
    );
    const governedReflection = governMemory(reflection, {
      rawSessionId,
    });

    await storeReflection(governedReflection, namespace, deps);

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
