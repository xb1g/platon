import { describe, expect, it, vi } from "vitest";

import {
  benchmarkTasks,
  type BenchmarkTask
} from "../../src/evals/benchmark-tasks.js";
import { runBenchmark } from "../../src/evals/run-benchmark.js";

const createTaskResult = (id: string, confidence: number, options: { harmful?: boolean } = {}) => ({
  id,
  type: "learning" as const,
  title: "Harnessed learning result",
  summary: "Result generated for harness comparison",
  confidence,
  reasons: [],
  sourceProvenance: [],
  usefulness: options.harmful
    ? {
      usefulCount: 0,
      harmfulCount: 1,
      score: -1
    }
    : {
      usefulCount: 1,
      harmfulCount: 0,
      score: 0.9
    }
});

describe("benchmark harness", () => {
  it("runs a benchmark in no-memory and memory-enabled modes", async () => {
    const runner = vi.fn(async (task: BenchmarkTask, mode: "baseline" | "memory") => {
      if (mode === "baseline") {
        return [];
      }

      return [createTaskResult(`${task.id}-memory`, 0.9)];
    });

    const result = await runBenchmark({
      tasks: benchmarkTasks.slice(0, 2),
      runner,
      failOnHarmful: false
    });

    expect(result.baseline.mode).toBe("baseline");
    expect(result.memory.mode).toBe("memory");
    expect(runner).toHaveBeenCalledTimes(4);
    expect(result.baseline.metrics.totalRetrieved).toBe(0);
    expect(result.memory.metrics.totalRetrieved).toBe(2);
  });

  it("stores comparable metrics for both modes", async () => {
    const runner = vi.fn(async (_task: BenchmarkTask, mode: "baseline" | "memory") => {
      if (mode === "baseline") {
        return [createTaskResult("baseline", 0.45)];
      }

      return [createTaskResult("memory", 0.82), createTaskResult("memory-2", 0.76)];
    });

    const result = await runBenchmark({
      tasks: benchmarkTasks.slice(0, 2),
      runner,
      failOnHarmful: false
    });

    expect(result.baseline.metrics.avgResultCount).toBe(1);
    expect(result.memory.metrics.avgResultCount).toBe(2);
    expect(result.memory.metrics.avgConfidence).toBeGreaterThan(
      result.baseline.metrics.avgConfidence
    );
    expect(result.lift.avgResultCount).toBe(1);
    expect(result.lift.avgConfidence).toBeGreaterThan(0);
  });

  it("fails the eval when harmful retrieval exceeds threshold", async () => {
    const runner = vi.fn(async (_task: BenchmarkTask, mode: "baseline" | "memory") => {
      if (mode === "baseline") {
        return [];
      }

      return [createTaskResult("harmful", 0.91, { harmful: true })];
    });

    await expect(
      runBenchmark({
        tasks: benchmarkTasks.slice(0, 1),
        runner,
        harmfulRateThreshold: 0
      })
    ).rejects.toThrow("Harmful retrieval rate");
  });
});
