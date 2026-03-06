import type { BenchmarkMode, BenchmarkModeRun, BenchmarkTaskResult, BenchmarkModeMetrics } from "./benchmark-tasks.js";

export const DEFAULT_HARMFUL_RETRIEVAL_RATE = 0.02;

export type ScoredBenchmarkRun = BenchmarkModeRun;

const sum = (values: number[]): number => values.reduce((acc, value) => acc + value, 0);

const mean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
};

export const scoreBenchmarkRun = (mode: BenchmarkMode, results: BenchmarkTaskResult[]): ScoredBenchmarkRun => {
  const tasksRun = results.length;
  const totalRetrieved = results.reduce((acc, result) => acc + result.totalCount, 0);
  const totalHarmful = results.reduce((acc, result) => acc + result.harmfulCount, 0);
  const avgResultCount = tasksRun > 0 ? totalRetrieved / tasksRun : 0;
  const avgConfidence = mean(results.map((result) => result.averageConfidence));
  const topConfidence = mean(results.map((result) => result.topConfidence ?? 0));
  const harmfulRate = totalRetrieved > 0 ? totalHarmful / totalRetrieved : 0;

  const metrics: BenchmarkModeMetrics = {
    tasksRun,
    totalRetrieved,
    avgResultCount,
    avgConfidence,
    topConfidence,
    harmfulCount: totalHarmful,
    harmfulRate
  };

  return { mode, metrics, results };
};

export const compareBenchmarkRuns = (
  baseline: ScoredBenchmarkRun,
  memory: ScoredBenchmarkRun
): {
  avgResultCount: number;
  avgConfidence: number;
  topConfidence: number;
} => ({
  avgResultCount: memory.metrics.avgResultCount - baseline.metrics.avgResultCount,
  avgConfidence: memory.metrics.avgConfidence - baseline.metrics.avgConfidence,
  topConfidence: memory.metrics.topConfidence - baseline.metrics.topConfidence
});

export const validateHarmfulThreshold = (
  run: ScoredBenchmarkRun,
  threshold = DEFAULT_HARMFUL_RETRIEVAL_RATE
): void => {
  if (run.metrics.harmfulRate > threshold) {
    throw new Error(
      `Harmful retrieval rate ${run.metrics.harmfulRate.toFixed(3)} exceeds threshold ${threshold}`
    );
  }
};

