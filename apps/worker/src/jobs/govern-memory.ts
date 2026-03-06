import type { ReflectionData } from '../lib/store-reflection.js';
import { scoreMemoryCandidate } from '../lib/memory-quality.js';

export const GOVERN_MEMORY_JOB_NAME = 'govern-memory';
export const GOVERNED_REFLECTION_VERSION = 'v2';

export type GovernMemoryInput = {
  rawSessionId?: string;
  reflection: ReflectionData;
};

type GovernMemoryDeps = {
  rawSessionId?: string;
  reflectionVersion?: string;
};

export const governMemory = (
  reflection: ReflectionData,
  deps?: GovernMemoryDeps
): ReflectionData => ({
  ...reflection,
  learnings: reflection.learnings.map((learning) => {
    const provenance = {
      ...learning.provenance,
      rawSessionId: learning.provenance?.rawSessionId ?? deps?.rawSessionId,
      reflectionVersion:
        learning.provenance?.reflectionVersion ??
        deps?.reflectionVersion ??
        GOVERNED_REFLECTION_VERSION,
    };
    const decision = scoreMemoryCandidate({
      ...learning,
      provenance,
    });
    const status = learning.status ?? decision.status;
    const qualityScore = learning.qualityScore ?? decision.qualityScore;

    return {
      ...learning,
      provenance,
      status,
      qualityScore,
      suppression:
        learning.suppression ??
        (status === 'published'
          ? undefined
          : {
              reason: decision.reason,
            }),
    };
  }),
});
