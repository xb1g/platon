import { createHash } from 'node:crypto';
import type { Session as Neo4jSession } from 'neo4j-driver';

export type MemoryStatus = 'candidate' | 'published' | 'suppressed' | 'quarantined';

export type LearningProvenance = {
  rawSessionId?: string;
  reflectionVersion?: string;
};

export type LearningSuppression = {
  reason: string;
};

export type LearningContradiction = {
  learningTitle: string;
  groupId?: string;
  reason?: string;
};

export type GovernedLearning = {
  title: string;
  confidence: number;
  status?: MemoryStatus;
  qualityScore?: number;
  provenance?: LearningProvenance;
  suppression?: LearningSuppression;
  contradiction?: LearningContradiction;
};

export type ResolvedLearningGovernance = {
  status: MemoryStatus;
  qualityScore: number;
  rawSessionId: string | null;
  reflectionVersion: string;
};

type WriteLearningGovernanceArgs = {
  session: Neo4jSession;
  namespaceId: string;
  learningKey: string;
  learning: GovernedLearning;
  status: MemoryStatus;
  qualityScore: number;
};

const DEFAULT_MEMORY_STATUS: MemoryStatus = 'published';
const DEFAULT_REFLECTION_VERSION = 'v1';

const createScopedKey = (namespaceId: string, value: string) =>
  createHash('sha256').update(`${namespaceId}::${value}`).digest('hex').slice(0, 32);

export const resolveLearningGovernance = (
  learning: GovernedLearning,
  defaultRawSessionId?: string
): ResolvedLearningGovernance => ({
  status: learning.status ?? DEFAULT_MEMORY_STATUS,
  qualityScore: learning.qualityScore ?? learning.confidence,
  rawSessionId: learning.provenance?.rawSessionId ?? defaultRawSessionId ?? null,
  reflectionVersion: learning.provenance?.reflectionVersion ?? DEFAULT_REFLECTION_VERSION,
});

export const withRawSessionProvenance = <T extends { learnings: GovernedLearning[] }>(
  reflection: T,
  rawSessionId?: string
): T => {
  if (rawSessionId == null) {
    return reflection;
  }

  return {
    ...reflection,
    learnings: reflection.learnings.map((learning) => ({
      ...learning,
      provenance: {
        ...learning.provenance,
        rawSessionId: learning.provenance?.rawSessionId ?? rawSessionId,
      },
    })),
  };
};

export const writeLearningGovernance = async ({
  session,
  namespaceId,
  learningKey,
  learning,
  status,
  qualityScore,
}: WriteLearningGovernanceArgs): Promise<void> => {
  if (learning.contradiction) {
    const relatedLearningKey = createScopedKey(namespaceId, learning.contradiction.learningTitle);

    await session.run(
      `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_LEARNING]->(l:Learning { learningKey: $learningKey })
       MERGE (other:Learning { learningKey: $relatedLearningKey })
       ON CREATE SET other.id = $relatedLearningKey,
                     other.namespaceId = $namespaceId,
                     other.title = $relatedLearningTitle,
                     other.summary = $relatedLearningTitle,
                     other.createdAt = datetime()
       MERGE (ns)-[:HAS_LEARNING]->(other)
       MERGE (l)-[r:CONTRADICTS]->(other)
       ON CREATE SET r.createdAt = datetime()
       SET r.groupId = $groupId,
           r.reason = $contradictionReason,
           r.updatedAt = datetime()`,
      {
        namespaceId,
        learningKey,
        relatedLearningKey,
        relatedLearningTitle: learning.contradiction.learningTitle,
        groupId: learning.contradiction.groupId ?? null,
        contradictionReason: learning.contradiction.reason ?? null,
      }
    );
  }

  if (learning.suppression) {
    const decisionKey = createScopedKey(
      namespaceId,
      `${learningKey}::suppression::${learning.suppression.reason}`
    );

    await session.run(
      `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_LEARNING]->(l:Learning { learningKey: $learningKey })
       MERGE (decision:MemoryQualityDecision { decisionKey: $decisionKey })
       ON CREATE SET decision.namespaceId = $namespaceId,
                     decision.type = 'suppression',
                     decision.status = $status,
                     decision.reason = $suppressionReason,
                     decision.qualityScore = $qualityScore,
                     decision.createdAt = datetime()
       ON MATCH SET  decision.status = $status,
                     decision.reason = $suppressionReason,
                     decision.qualityScore = $qualityScore,
                     decision.updatedAt = datetime()
       MERGE (ns)-[:HAS_DECISION]->(decision)
       MERGE (decision)-[:SUPPRESSES]->(l)`,
      {
        namespaceId,
        learningKey,
        decisionKey,
        status,
        qualityScore,
        suppressionReason: learning.suppression.reason,
      }
    );
  }
};
