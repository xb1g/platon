import type { RetrievalResult } from "@memory/shared";

export type BenchmarkMode = "baseline" | "memory";

export type BenchmarkTask = {
  id: string;
  query: string;
  description: string;
};

export type BenchmarkTaskResult = {
  taskId: string;
  mode: BenchmarkMode;
  results: RetrievalResult[];
  totalCount: number;
  averageConfidence: number;
  topConfidence: number | null;
  harmfulCount: number;
  harmfulRate: number;
  startedAt: string;
  completedAt: string;
};

export type BenchmarkModeMetrics = {
  tasksRun: number;
  totalRetrieved: number;
  avgResultCount: number;
  avgConfidence: number;
  topConfidence: number;
  harmfulCount: number;
  harmfulRate: number;
};

export type BenchmarkModeRun = {
  mode: BenchmarkMode;
  metrics: BenchmarkModeMetrics;
  results: BenchmarkTaskResult[];
};

export type BenchmarkLift = {
  avgResultCount: number;
  avgConfidence: number;
  topConfidence: number;
};

export type BenchmarkComparison = {
  baseline: BenchmarkModeRun;
  memory: BenchmarkModeRun;
  lift: BenchmarkLift;
  completedAt: string;
};

export const benchmarkTasks: readonly BenchmarkTask[] = [
  {
    id: "cache-timeout-recovery",
    query: "How should an agent recover when cache refresh fails during runtime?",
    description: "Validates memory retrieval can suggest fallback behavior after infra failure."
  },
  {
    id: "payment-retry-diagnostics",
    query: "What caused a failed paid request to recover successfully later?",
    description: "Measures whether retrieval returns actionable payment recovery guidance."
  },
  {
    id: "agent-bootstrap-consistency",
    query: "What startup check should run before entering a production support loop?",
    description: "Checks retrieval quality for bootstrap and startup recommendations."
  }
];

