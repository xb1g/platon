import type { RetrievalResult } from '@memory/shared';
import { createHash } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import { query } from '../postgres.js';
import { embedText } from './embed.js';

export type VectorStoreCandidate = RetrievalResult & {
  namespaceId: string;
};

export type VectorStoreHit = VectorStoreCandidate & {
  similarity: number;
};

type VectorStoreRow = QueryResultRow & {
  memory_id: string;
  namespace_id: string;
  memory_type: RetrievalResult['type'];
  title: string;
  summary: string;
  confidence: number;
  quality_score: number | null;
  status: string;
  source_provenance: unknown;
  content_hash: string | null;
  embedding_json: unknown;
};

type VectorStoreSyncArgs = {
  namespaceId: string;
  candidates: VectorStoreCandidate[];
};

type VectorStoreSearchArgs = {
  namespaceId: string;
  embedding: number[];
  limit: number;
};

type VectorStoreDeps = {
  embedCandidate?: (text: string) => Promise<number[]>;
};

export type VectorStore = {
  syncCandidates: (args: VectorStoreSyncArgs) => Promise<void>;
  search: (args: VectorStoreSearchArgs) => Promise<VectorStoreHit[]>;
};

const ensureVectorTableSql = `
  CREATE TABLE IF NOT EXISTS memory_vectors (
    memory_id TEXT PRIMARY KEY,
    namespace_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    quality_score DOUBLE PRECISION,
    status TEXT NOT NULL,
    source_provenance JSONB NOT NULL DEFAULT '[]'::jsonb,
    content_hash TEXT,
    embedding_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE memory_vectors
    ADD COLUMN IF NOT EXISTS content_hash TEXT;

  CREATE INDEX IF NOT EXISTS memory_vectors_namespace_status_idx
    ON memory_vectors (namespace_id, status);
`;

let ensureVectorTablePromise: Promise<void> | null = null;
const SEARCH_CANDIDATE_FLOOR = 50;
const SEARCH_CANDIDATE_MULTIPLIER = 10;
const UPSERT_CONCURRENCY = 4;

const ensureVectorTable = async (): Promise<void> => {
  if (!ensureVectorTablePromise) {
    ensureVectorTablePromise = query(ensureVectorTableSql)
      .then(() => undefined)
      .catch((error) => {
        ensureVectorTablePromise = null;
        throw error;
      });
  }

  return ensureVectorTablePromise;
};

const createEmbeddingText = (candidate: Pick<VectorStoreCandidate, 'title' | 'summary'>) =>
  `${candidate.title}\n\n${candidate.summary}`.trim();

const createContentHash = (candidate: Pick<VectorStoreCandidate, 'title' | 'summary'>): string =>
  createHash('sha256').update(createEmbeddingText(candidate)).digest('hex');

const chunk = <T>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
};

const toEmbedding = (value: unknown): number[] => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) {
    return [];
  }

  return value as number[];
};

const toSourceProvenance = (value: unknown): RetrievalResult['sourceProvenance'] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is RetrievalResult['sourceProvenance'][number] => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return typeof (item as { sessionId?: unknown }).sessionId === 'string';
  });
};

const cosineSimilarity = (left: number[], right: number[]): number => {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;

    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

export const createVectorStore = (deps?: VectorStoreDeps): VectorStore => ({
  async syncCandidates({ namespaceId, candidates }) {
    await ensureVectorTable();

    const embedCandidate = deps?.embedCandidate ?? embedText;
    const scopedCandidates = candidates.filter(
      (candidate) =>
        candidate.namespaceId === namespaceId &&
        (candidate.status === 'published' || candidate.status == null)
    );
    const existingRows = scopedCandidates.length
      ? await query<Pick<VectorStoreRow, 'memory_id' | 'content_hash' | 'embedding_json'>>(
          `
            SELECT memory_id, content_hash, embedding_json
            FROM memory_vectors
            WHERE memory_id = ANY($1::text[])
          `,
          [scopedCandidates.map((candidate) => candidate.id)]
        )
      : { rows: [] };
    const existingById = new Map<string, { contentHash: string | null; embedding: number[] }>(
      existingRows.rows.map(
        (row): [string, { contentHash: string | null; embedding: number[] }] => [
          row.memory_id,
          {
            contentHash: row.content_hash,
            embedding: toEmbedding(row.embedding_json),
          },
        ]
      )
    );

    const upsertCandidate = async (candidate: VectorStoreCandidate): Promise<void> => {
      const contentHash = createContentHash(candidate);
      const existing = existingById.get(candidate.id);
      const embedding =
        existing && existing.contentHash === contentHash
          ? existing.embedding
          : await embedCandidate(createEmbeddingText(candidate));

      await query(
        `
          INSERT INTO memory_vectors (
            memory_id,
            namespace_id,
            memory_type,
            title,
            summary,
            confidence,
            quality_score,
            status,
            source_provenance,
            content_hash,
            embedding_json,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, NOW())
          ON CONFLICT (memory_id)
          DO UPDATE SET
            namespace_id = EXCLUDED.namespace_id,
            memory_type = EXCLUDED.memory_type,
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            confidence = EXCLUDED.confidence,
            quality_score = EXCLUDED.quality_score,
            status = EXCLUDED.status,
            source_provenance = EXCLUDED.source_provenance,
            content_hash = EXCLUDED.content_hash,
            embedding_json = EXCLUDED.embedding_json,
            updated_at = NOW()
        `,
        [
          candidate.id,
          candidate.namespaceId,
          candidate.type,
          candidate.title,
          candidate.summary,
          candidate.confidence,
          candidate.qualityScore ?? null,
          candidate.status ?? 'published',
          JSON.stringify(candidate.sourceProvenance ?? []),
          contentHash,
          JSON.stringify(embedding),
        ]
      );
    };

    for (const batch of chunk(scopedCandidates, UPSERT_CONCURRENCY)) {
      await Promise.all(batch.map((candidate) => upsertCandidate(candidate)));
    }
  },

  async search({ namespaceId, embedding, limit }) {
    await ensureVectorTable();
    const candidateLimit = Math.min(Math.max(limit * SEARCH_CANDIDATE_MULTIPLIER, SEARCH_CANDIDATE_FLOOR), 250);

    const result = await query<VectorStoreRow>(
      `
        SELECT
          memory_id,
          namespace_id,
          memory_type,
          title,
          summary,
          confidence,
          quality_score,
          status,
          source_provenance,
          content_hash,
          embedding_json
        FROM memory_vectors
        WHERE namespace_id = $1
          AND status = 'published'
        ORDER BY COALESCE(quality_score, confidence) DESC, updated_at DESC
        LIMIT $2
      `,
      [namespaceId, candidateLimit]
    );

    return result.rows
      .map((row): VectorStoreHit => ({
        id: row.memory_id,
        namespaceId: row.namespace_id,
        type: row.memory_type,
        title: row.title,
        summary: row.summary,
        confidence: row.confidence,
        qualityScore: row.quality_score ?? undefined,
        status: row.status as VectorStoreCandidate['status'],
        reasons: [],
        sourceProvenance: toSourceProvenance(row.source_provenance),
        similarity: cosineSimilarity(embedding, toEmbedding(row.embedding_json)),
      }))
      .filter((row) => row.similarity > 0)
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, limit);
  },
});

export const vectorStore = createVectorStore();
