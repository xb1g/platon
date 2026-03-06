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

export const closeAdminNeo4jDriver = async () => {
  if (!driver) {
    return;
  }

  await driver.close();
  driver = null;
};
