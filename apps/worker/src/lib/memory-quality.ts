import type { GovernedLearning, MemoryStatus } from './store-memory-governance.js';

export type MemoryQualityMetrics = {
  actionability: number;
  provenance: number;
  risk: number;
  specificity: number;
};

export type MemoryQualityDecision = {
  metrics: MemoryQualityMetrics;
  qualityScore: number;
  reason: string;
  status: MemoryStatus;
};

const ACTION_TERMS = [
  'add',
  'backoff',
  'cache',
  'check',
  'deploy',
  'pin',
  'refresh',
  'retry',
  'rollback',
  'rotate',
  'validate',
  'verify',
];

const GENERIC_PATTERNS = [
  /\bbe more careful\b/i,
  /\bnext time\b/i,
  /\bdo better\b/i,
  /\bimprove\b/i,
  /\bbe smarter\b/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /\bignore previous instructions\b/i,
  /\breveal (?:the )?(?:system|developer) prompt\b/i,
  /\bsystem prompt\b/i,
  /\bdeveloper message\b/i,
  /\bexfiltrat(?:e|ion)\b/i,
  /\bprint .*api key\b/i,
];

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

const scoreSpecificity = (title: string): number => {
  if (GENERIC_PATTERNS.some((pattern) => pattern.test(title))) {
    return 0.15;
  }

  const words = title
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  const uniqueWords = new Set(words);
  const lengthScore = Math.min(1, words.length / 10);
  const uniquenessScore = words.length === 0 ? 0 : uniqueWords.size / words.length;

  return clamp(lengthScore * 0.65 + uniquenessScore * 0.35);
};

const scoreActionability = (title: string): number => {
  const lower = title.toLowerCase();
  const matches = ACTION_TERMS.filter((term) => lower.includes(term)).length;

  return clamp(matches === 0 ? 0.2 : 0.35 + matches * 0.2);
};

const scoreProvenance = (learning: GovernedLearning): number => {
  const rawSessionId = learning.provenance?.rawSessionId ? 0.5 : 0;
  const reflectionVersion = learning.provenance?.reflectionVersion ? 0.5 : 0;

  return clamp(rawSessionId + reflectionVersion);
};

const scoreRisk = (title: string): number => {
  const lower = title.toLowerCase();

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(lower))) {
    return 0.95;
  }

  if (lower.includes('token') || lower.includes('password') || lower.includes('secret')) {
    return 0.6;
  }

  return 0.05;
};

export const scoreMemoryCandidate = (learning: GovernedLearning): MemoryQualityDecision => {
  const metrics: MemoryQualityMetrics = {
    specificity: scoreSpecificity(learning.title),
    actionability: scoreActionability(learning.title),
    provenance: scoreProvenance(learning),
    risk: scoreRisk(learning.title),
  };

  if (metrics.risk >= 0.85) {
    return {
      status: 'quarantined',
      reason: 'prompt_injection_risk',
      qualityScore: 0,
      metrics,
    };
  }

  const qualityScore = clamp(
    learning.confidence * 0.25 +
      metrics.specificity * 0.35 +
      metrics.actionability * 0.2 +
      metrics.provenance * 0.2 -
      metrics.risk * 0.5
  );

  if (metrics.specificity < 0.35) {
    return {
      status: 'suppressed',
      reason: 'low_specificity',
      qualityScore,
      metrics,
    };
  }

  if (qualityScore < 0.55) {
    return {
      status: 'suppressed',
      reason: 'low_quality',
      qualityScore,
      metrics,
    };
  }

  return {
    status: 'published',
    reason: 'publish',
    qualityScore,
    metrics,
  };
};
