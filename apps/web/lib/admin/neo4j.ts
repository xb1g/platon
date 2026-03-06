import neo4j from "neo4j-driver";
import { getNeo4jConfig } from "./config";

export type AdminGraphSummary = {
  namespaceCount: number;
  sessionCount: number;
  learningCount: number;
  relationshipCount: number;
};

export type AdminGraphCountRow = {
  name: string;
  count: number;
};

export type AdminRecentNode = {
  kind: "session" | "learning";
  id: string;
  title: string;
  status: string | null;
  timestamp: string | null;
};

type Neo4jRecordLike = {
  get(key: string): unknown;
};

let driver: ReturnType<typeof neo4j.driver> | null = null;

const getDriver = () => {
  if (!driver) {
    const config = getNeo4jConfig();
    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
    );
  }

  return driver;
};

const intValue = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  "toNumber" in value &&
  typeof value.toNumber === "function"
    ? value.toNumber()
    : Number(value ?? 0);

export const getGraphSummary = async (): Promise<AdminGraphSummary> => {
  const session = getDriver().session();

  try {
    const result = await session.run(`
      CALL {
        MATCH (n:MemoryNamespace)
        RETURN count(n) AS namespaceCount
      }
      CALL {
        MATCH (s:Session)
        RETURN count(s) AS sessionCount
      }
      CALL {
        MATCH (l:Learning)
        RETURN count(l) AS learningCount
      }
      CALL {
        MATCH ()-[r]->()
        RETURN count(r) AS relationshipCount
      }
      RETURN namespaceCount, sessionCount, learningCount, relationshipCount
    `);
    const row = result.records[0];

    return {
      namespaceCount: intValue(row?.get("namespaceCount")),
      sessionCount: intValue(row?.get("sessionCount")),
      learningCount: intValue(row?.get("learningCount")),
      relationshipCount: intValue(row?.get("relationshipCount")),
    };
  } finally {
    await session.close();
  }
};

export const getLabelCounts = async (): Promise<AdminGraphCountRow[]> => {
  const session = getDriver().session();

  try {
    const result = await session.run(`
      MATCH (n)
      UNWIND labels(n) AS label
      RETURN label AS name, count(*) AS count
      ORDER BY count DESC, label ASC
    `);

    return result.records.map((record: Neo4jRecordLike) => ({
      name: String(record.get("name")),
      count: intValue(record.get("count")),
    }));
  } finally {
    await session.close();
  }
};

export const getRelationshipCounts = async (): Promise<AdminGraphCountRow[]> => {
  const session = getDriver().session();

  try {
    const result = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) AS name, count(*) AS count
      ORDER BY count DESC, name ASC
    `);

    return result.records.map((record: Neo4jRecordLike) => ({
      name: String(record.get("name")),
      count: intValue(record.get("count")),
    }));
  } finally {
    await session.close();
  }
};

export const getRecentNodes = async (limit = 10): Promise<AdminRecentNode[]> => {
  const session = getDriver().session();

  try {
    const [sessionResult, learningResult] = await Promise.all([
      session.run(
        `
          MATCH (s:Session)
          RETURN
            s.sessionId AS id,
            coalesce(s.taskSummary, s.outcomeSummary, s.sessionId) AS title,
            s.status AS status,
            coalesce(toString(s.updatedAt), toString(s.createdAt)) AS timestamp
          ORDER BY coalesce(s.updatedAt, s.createdAt) DESC
          LIMIT $limit
        `,
        { limit: neo4j.int(limit) },
      ),
      session.run(
        `
          MATCH (l:Learning)
          RETURN
            coalesce(l.id, l.learningKey) AS id,
            coalesce(l.title, l.summary, l.id) AS title,
            l.status AS status,
            coalesce(toString(l.updatedAt), toString(l.createdAt)) AS timestamp
          ORDER BY coalesce(l.updatedAt, l.createdAt) DESC
          LIMIT $limit
        `,
        { limit: neo4j.int(limit) },
      ),
    ]);

    return [
      ...sessionResult.records.map((record: Neo4jRecordLike) => ({
        kind: "session" as const,
        id: String(record.get("id")),
        title: String(record.get("title")),
        status: record.get("status") ? String(record.get("status")) : null,
        timestamp: record.get("timestamp")
          ? String(record.get("timestamp"))
          : null,
      })),
      ...learningResult.records.map((record: Neo4jRecordLike) => ({
        kind: "learning" as const,
        id: String(record.get("id")),
        title: String(record.get("title")),
        status: record.get("status") ? String(record.get("status")) : null,
        timestamp: record.get("timestamp")
          ? String(record.get("timestamp"))
          : null,
      })),
    ]
      .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
      .slice(0, limit * 2);
  } finally {
    await session.close();
  }
};

export type AdminSubscriberSummary = {
  subscriberId: string;
  namespaceCount: number;
  sessionCount: number;
  learningCount: number;
};

export type AdminSubscriberNamespace = {
  namespaceId: string;
  agentKind: string;
  agentId: string;
  sessionCount: number;
  learningCount: number;
};

export type AdminSubscriberLearning = {
  id: string;
  title: string;
  status: string | null;
  confidence: number | null;
  qualityScore: number | null;
};

export type AdminSubscriberGraphData = {
  subscriberId: string;
  namespaceCount: number;
  sessionCount: number;
  learningCount: number;
  namespaces: AdminSubscriberNamespace[];
  recentLearnings: AdminSubscriberLearning[];
};

export const listSubscribers = async (): Promise<AdminSubscriberSummary[]> => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (ns:MemoryNamespace)
      WITH ns.subscriberId AS subscriberId, count(DISTINCT ns) AS namespaceCount
      MATCH (ns2:MemoryNamespace)
      WHERE ns2.subscriberId = subscriberId
      OPTIONAL MATCH (ns2)-[:HAS_SESSION]->(s:Session)
      OPTIONAL MATCH (ns2)-[:HAS_LEARNING]->(l:Learning)
      RETURN
        subscriberId,
        namespaceCount,
        count(DISTINCT s) AS sessionCount,
        count(DISTINCT l) AS learningCount
      ORDER BY sessionCount DESC, subscriberId ASC
    `);

    return result.records.map((record: Neo4jRecordLike) => ({
      subscriberId: String(record.get('subscriberId')),
      namespaceCount: intValue(record.get('namespaceCount')),
      sessionCount: intValue(record.get('sessionCount')),
      learningCount: intValue(record.get('learningCount')),
    }));
  } finally {
    await session.close();
  }
};

export const getSubscriberGraph = async (
  subscriberId: string,
): Promise<AdminSubscriberGraphData> => {
  const session = getDriver().session();
  try {
    const [nsResult, learningsResult] = await Promise.all([
      session.run(
        `
          MATCH (ns:MemoryNamespace { subscriberId: $subscriberId })
          OPTIONAL MATCH (ns)-[:HAS_SESSION]->(s:Session)
          OPTIONAL MATCH (ns)-[:HAS_LEARNING]->(l:Learning)
          RETURN
            ns.namespaceId AS namespaceId,
            coalesce(ns.agentKind, '') AS agentKind,
            coalesce(ns.agentId, '') AS agentId,
            count(DISTINCT s) AS sessionCount,
            count(DISTINCT l) AS learningCount
          ORDER BY sessionCount DESC
        `,
        { subscriberId },
      ),
      session.run(
        `
          MATCH (ns:MemoryNamespace { subscriberId: $subscriberId })-[:HAS_LEARNING]->(l:Learning)
          RETURN
            coalesce(l.id, l.learningKey) AS id,
            coalesce(l.title, l.summary, l.id) AS title,
            l.status AS status,
            l.confidence AS confidence,
            l.qualityScore AS qualityScore
          ORDER BY coalesce(l.updatedAt, l.createdAt) DESC
          LIMIT 20
        `,
        { subscriberId },
      ),
    ]);

    const namespaces: AdminSubscriberNamespace[] = nsResult.records.map(
      (record: Neo4jRecordLike) => ({
        namespaceId: String(record.get('namespaceId')),
        agentKind: String(record.get('agentKind')),
        agentId: String(record.get('agentId')),
        sessionCount: intValue(record.get('sessionCount')),
        learningCount: intValue(record.get('learningCount')),
      }),
    );

    const recentLearnings: AdminSubscriberLearning[] =
      learningsResult.records.map((record: Neo4jRecordLike) => ({
        id: String(record.get('id') ?? ''),
        title: String(record.get('title') ?? ''),
        status: record.get('status') ? String(record.get('status')) : null,
        confidence:
          record.get('confidence') != null
            ? Number(record.get('confidence'))
            : null,
        qualityScore:
          record.get('qualityScore') != null
            ? Number(record.get('qualityScore'))
            : null,
      }));

    const totals = namespaces.reduce(
      (acc, ns) => ({
        sessionCount: acc.sessionCount + ns.sessionCount,
        learningCount: acc.learningCount + ns.learningCount,
      }),
      { sessionCount: 0, learningCount: 0 },
    );

    return {
      subscriberId,
      namespaceCount: namespaces.length,
      sessionCount: totals.sessionCount,
      learningCount: totals.learningCount,
      namespaces,
      recentLearnings,
    };
  } finally {
    await session.close();
  }
};

export const closeAdminNeo4jDriver = async () => {
  if (!driver) {
    return;
  }

  await driver.close();
  driver = null;
};
