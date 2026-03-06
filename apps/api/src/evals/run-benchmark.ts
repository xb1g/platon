import type { RetrievalResult } from "@memory/shared";

import {
  benchmarkTasks,
  type BenchmarkComparison,
  type BenchmarkMode,
  type BenchmarkTask,
  type BenchmarkTaskResult
} from "./benchmark-tasks.js";
import {
  compareBenchmarkRuns,
  DEFAULT_HARMFUL_RETRIEVAL_RATE,
  scoreBenchmarkRun,
  validateHarmfulThreshold,
  type ScoredBenchmarkRun
} from "./score-run.js";

type BenchmarkRunner = (task: BenchmarkTask, mode: BenchmarkMode) => Promise<RetrievalResult[]>;

export type RunBenchmarkTaskOptions = {
  now?: () => string;
  runner?: BenchmarkRunner;
};

export type RunBenchmarkOptions = RunBenchmarkTaskOptions & {
  tasks?: readonly BenchmarkTask[];
  failOnHarmful?: boolean;
  harmfulRateThreshold?: number;
};

const defaultNow = () => new Date().toISOString();

const isHarmful = (result: RetrievalResult): boolean => {
  if (result.usefulness?.score !== undefined) {
    return result.usefulness.score < 0;
  }

  return result.type === "failure";
};

const defaultRunner: BenchmarkRunner = async () => [];

export const runBenchmarkTask = async (
  task: BenchmarkTask,
  mode: BenchmarkMode,
  options: RunBenchmarkTaskOptions = {}
): Promise<BenchmarkTaskResult> => {
  const now = options.now ?? defaultNow;
  const runTask = options.runner ?? defaultRunner;
  const startedAt = now();
  const results = await runTask(task, mode);
  const totalCount = results.length;
  const totalConfidence = results.reduce((acc, result) => acc + result.confidence, 0);
  const averageConfidence = totalCount > 0 ? totalConfidence / totalCount : 0;
  const topConfidence = totalCount > 0 ? Math.max(...results.map((result) => result.confidence)) : null;
  const harmfulCount = results.filter(isHarmful).length;
  const harmfulRate = totalCount > 0 ? harmfulCount / totalCount : 0;

  return {
    taskId: task.id,
    mode,
    results,
    totalCount,
    averageConfidence,
    topConfidence,
    harmfulCount,
    harmfulRate,
    startedAt,
    completedAt: now()
  };
};

export const runBenchmark = async (
  options: RunBenchmarkOptions = {}
): Promise<BenchmarkComparison> => {
  const now = options.now ?? defaultNow;
  const runner = options.runner ?? defaultRunner;
  const tasks = options.tasks ?? benchmarkTasks;
  const failOnHarmful = options.failOnHarmful ?? true;
  const harmfulRateThreshold =
    options.harmfulRateThreshold ?? DEFAULT_HARMFUL_RETRIEVAL_RATE;

  const [baselineResults, memoryResults] = await Promise.all([
    Promise.all(
      tasks.map((task) =>
        runBenchmarkTask(task, "baseline", {
          now,
          runner
        })
      )
    ),
    Promise.all(
      tasks.map((task) =>
        runBenchmarkTask(task, "memory", {
          now,
          runner
        })
      )
    )
  ]);

  const baseline = scoreBenchmarkRun("baseline", baselineResults) as ScoredBenchmarkRun;
  const memory = scoreBenchmarkRun("memory", memoryResults) as ScoredBenchmarkRun;

  if (failOnHarmful) {
    validateHarmfulThreshold(memory, harmfulRateThreshold);
  }

  return {
    baseline,
    memory,
    lift: compareBenchmarkRuns(baseline, memory),
    completedAt: now()
  };
};

