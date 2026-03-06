import { createHash } from 'node:crypto';
import type { Session as Neo4jSession } from 'neo4j-driver';
import { resolveNamespace, type NamespaceParams } from './memory-namespace.js';
import {
  resolveLearningGovernance,
  writeLearningGovernance,
  type GovernedLearning,
} from './store-memory-governance.js';

export type ReflectionData = {
  sessionId: string;
  taskSummary?: string;
  outcomeSummary?: string;
  wentWell: string[];
  wentWrong: string[];
  likelyCauses: string[];
  reusableTactics: string[];
  learnings: GovernedLearning[];
  confidence: number;
};

export type StoreReflectionDeps = {
  session: Neo4jSession;
};

const createScopedKey = (namespaceId: string, value: string) =>
  createHash('sha256').update(`${namespaceId}::${value}`).digest('hex').slice(0, 32);

export const storeReflection = async (
  reflection: ReflectionData,
  namespace: NamespaceParams,
  deps?: StoreReflectionDeps
): Promise<void> => {
  if (!deps?.session) {
    console.log('No Neo4j session provided, skipping graph write');
    return;
  }

  const ns = resolveNamespace(namespace);
  const sessionKey = createScopedKey(ns.namespaceId, reflection.sessionId);

  await deps.session.run(
    `MERGE (ns:MemoryNamespace { namespaceId: $namespaceId })
     ON CREATE SET ns.subscriberId = $subscriberId,
                   ns.agentKind = $agentKind,
                   ns.agentId = $agentId,
                   ns.createdAt = datetime()
     ON MATCH SET  ns.lastAccessedAt = datetime()`,
    ns
  );

  await deps.session.run(
    `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })
     MERGE (s:Session { sessionKey: $sessionKey })
     ON CREATE SET s.sessionId = $sessionId,
                   s.namespaceId = $namespaceId,
                   s.taskSummary = $taskSummary,
                   s.outcomeSummary = $outcomeSummary,
                   s.status = CASE WHEN size($wentWrong) > 0 THEN 'failed' ELSE 'success' END,
                   s.confidence = $confidence,
                   s.createdAt = datetime()
     ON MATCH SET  s.taskSummary = $taskSummary,
                   s.outcomeSummary = $outcomeSummary,
                   s.status = CASE WHEN size($wentWrong) > 0 THEN 'failed' ELSE 'success' END,
                   s.confidence = $confidence,
                   s.updatedAt = datetime()
     MERGE (ns)-[:HAS_SESSION]->(s)`,
    {
      namespaceId: ns.namespaceId,
      sessionKey,
      sessionId: reflection.sessionId,
      taskSummary: reflection.taskSummary ?? null,
      outcomeSummary: reflection.outcomeSummary ?? null,
      wentWrong: reflection.wentWrong,
      confidence: reflection.confidence,
    }
  );

  for (const learning of reflection.learnings) {
    const learningKey = createScopedKey(ns.namespaceId, learning.title);
    const governance = resolveLearningGovernance(learning);

    await deps.session.run(
      `MATCH (ns:MemoryNamespace { namespaceId: $namespaceId })-[:HAS_SESSION]->(s:Session { sessionKey: $sessionKey })
       MERGE (l:Learning { learningKey: $learningKey })
       ON CREATE SET l.id = $learningKey,
                     l.namespaceId = $namespaceId,
                     l.title = $title,
                     l.summary = $title,
                     l.confidence = $confidence,
                     l.qualityScore = $qualityScore,
                     l.status = $status,
                     l.rawSessionId = $rawSessionId,
                     l.reflectionVersion = $reflectionVersion,
                     l.createdAt = datetime()
       ON MATCH SET  l.confidence = $confidence,
                     l.qualityScore = $qualityScore,
                     l.status = $status,
                     l.rawSessionId = $rawSessionId,
                     l.reflectionVersion = $reflectionVersion,
                     l.updatedAt = datetime()
       MERGE (s)-[:PRODUCED]->(l)
       MERGE (ns)-[:HAS_LEARNING]->(l)`,
      {
        namespaceId: ns.namespaceId,
        sessionKey,
        sessionId: reflection.sessionId,
        learningKey,
        title: learning.title,
        confidence: learning.confidence,
        qualityScore: governance.qualityScore,
        status: governance.status,
        rawSessionId: governance.rawSessionId,
        reflectionVersion: governance.reflectionVersion,
      }
    );

    await writeLearningGovernance({
      session: deps.session,
      namespaceId: ns.namespaceId,
      learningKey,
      learning,
      status: governance.status,
      qualityScore: governance.qualityScore,
    });
  }
};
