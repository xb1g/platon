import type { RetrievalResult } from '@memory/shared';

type NamespaceMatch = 'exact' | 'cross_namespace';
type RetrievalSignal = 'failure_pattern' | 'semantic';

type RankableResult = RetrievalResult & {
  createdAt?: string;
  namespaceMatch?: NamespaceMatch;
  signal?: RetrievalSignal;
};

export type ScoredResult = RankableResult & {
  score: number;
  source: 'graph' | 'vector';
};

const WEIGHTS = {
  confidence: 0.35,
  freshness: 0.2,
  exactness: 0.2,
  sourceBoost: 0.1,
  signal: 0.05,
  quality: 0.1,
  usefulness: 0.15,
} as const;

const SOURCE_BOOST: Record<string, number> = {
  graph: 1.0,
  vector: 0.7,
};

const TYPE_BOOST: Record<string, number> = {
  failure: 1.2,
  learning: 1.1,
  success_pattern: 1.0,
  session: 0.8,
};

const EXACTNESS_BOOST: Record<NamespaceMatch, number> = {
  exact: 1.0,
  cross_namespace: 0.2,
};

const SIGNAL_BOOST: Record<RetrievalSignal, number> = {
  failure_pattern: 1.0,
  semantic: 0.55,
};

const getFreshnessScore = (createdAt?: string): number => {
  if (!createdAt) {
    return 0.5;
  }

  const parsed = Date.parse(createdAt);
  if (Number.isNaN(parsed)) {
    return 0.5;
  }

  const ageInDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24);

  if (ageInDays <= 3) {
    return 1.0;
  }

  if (ageInDays <= 30) {
    return 0.75;
  }

  if (ageInDays <= 180) {
    return 0.45;
  }

  return 0.15;
};

const getUsefulnessScore = (result: RankableResult): number => {
  if (!result.usefulness) {
    return 0;
  }

  return Math.max(-1, Math.min(1, result.usefulness.score));
};

const pushReason = (
  reasons: RetrievalResult['reasons'],
  reason: RetrievalResult['reasons'][number]
) => {
  if (reasons.some((existing) => existing.kind === reason.kind && existing.summary === reason.summary)) {
    return;
  }

  reasons.push(reason);
};

const buildRankingReasons = (result: ScoredResult): RetrievalResult['reasons'] => {
  const reasons: RetrievalResult['reasons'] = [...(result.reasons ?? [])];
  const namespaceMatch =
    result.namespaceMatch ?? (result.source === 'graph' ? 'exact' : 'cross_namespace');
  const signal = result.signal ?? (result.type === 'failure' ? 'failure_pattern' : 'semantic');
  const freshness = getFreshnessScore(result.createdAt);
  const usefulnessScore = getUsefulnessScore(result);

  if (namespaceMatch === 'exact') {
    pushReason(reasons, {
      kind: 'graph_neighbor',
      summary: 'Exact namespace match from this agent memory set.',
      score: 1,
    });
  }

  if (signal === 'failure_pattern') {
    pushReason(reasons, {
      kind: 'graph_neighbor',
      summary: 'Matched a prior failure pattern linked in graph memory.',
      score: 0.9,
    });
  }

  if (freshness >= 0.75) {
    pushReason(reasons, {
      kind: 'freshness',
      summary: 'Recent memory is favored over stale near-ties.',
      score: Number(freshness.toFixed(4)),
    });
  }

  if ((result.qualityScore ?? result.confidence) >= 0.7) {
    pushReason(reasons, {
      kind: 'provenance_quality',
      summary: 'Governed memory quality increased confidence in this result.',
      score: Number((result.qualityScore ?? result.confidence).toFixed(4)),
    });
  }

  if (usefulnessScore > 0) {
    pushReason(reasons, {
      kind: 'usefulness',
      summary: 'Earlier retrievals marked this memory as useful.',
      score: Number(usefulnessScore.toFixed(4)),
    });
  }

  if (usefulnessScore < 0) {
    pushReason(reasons, {
      kind: 'conflict_penalty',
      summary: 'Earlier retrievals marked this memory as harmful.',
      score: Number(Math.abs(usefulnessScore).toFixed(4)),
    });
  }

  return reasons;
};

const computeScore = (result: ScoredResult): number => {
  const confidenceScore = result.confidence * WEIGHTS.confidence;
  const freshnessScore = getFreshnessScore(result.createdAt) * WEIGHTS.freshness;
  const exactnessScore =
    (EXACTNESS_BOOST[result.namespaceMatch ?? (result.source === 'graph' ? 'exact' : 'cross_namespace')] ??
      EXACTNESS_BOOST.cross_namespace) * WEIGHTS.exactness;
  const sourceScore = (SOURCE_BOOST[result.source] ?? 0.5) * WEIGHTS.sourceBoost;
  const signalScore =
    (SIGNAL_BOOST[result.signal ?? (result.type === 'failure' ? 'failure_pattern' : 'semantic')] ??
      SIGNAL_BOOST.semantic) * WEIGHTS.signal;
  const qualityScore = (result.qualityScore ?? result.confidence) * WEIGHTS.quality;
  const usefulnessScore = getUsefulnessScore(result) * WEIGHTS.usefulness;
  const typeBoost = TYPE_BOOST[result.type] ?? 1.0;
  const statusPenalty =
    result.status === 'quarantined' ? 0 :
    result.status === 'suppressed' ? 0.2 :
    1.0;

  return (
    confidenceScore +
    freshnessScore +
    exactnessScore +
    sourceScore +
    signalScore +
    qualityScore +
    usefulnessScore
  ) * typeBoost * statusPenalty;
};

export const rankResults = (
  graphResults: RankableResult[],
  vectorResults: RankableResult[]
): RetrievalResult[] => {
  const scored: ScoredResult[] = [
    ...graphResults.map((r) => ({ ...r, source: 'graph' as const, score: 0 })),
    ...vectorResults.map((r) => ({ ...r, source: 'vector' as const, score: 0 })),
  ];

  for (const result of scored) {
    result.score = computeScore(result);
  }

  const deduped = new Map<string, ScoredResult>();
  for (const result of scored) {
    const existing = deduped.get(result.id);
    if (!existing || result.score > existing.score) {
      deduped.set(result.id, result);
    }
  }

  const sorted = [...deduped.values()].sort((a, b) => b.score - a.score);

  return sorted.map(
    ({ score, source, createdAt, namespaceMatch, signal, ...rest }): RetrievalResult => ({
      ...rest,
      reasons: buildRankingReasons({
        ...rest,
        score,
        source,
        createdAt,
        namespaceMatch,
        signal,
      }),
    })
  );
};
