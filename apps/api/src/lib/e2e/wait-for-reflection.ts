export type ReflectionStatus = "queued" | "processing" | "completed" | "failed" | "pending_retry" | string;

export type WaitForReflectionOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
};

const TERMINAL_STATUSES = new Set<ReflectionStatus>(["completed", "failed"]);

const sleep = async (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const waitForReflection = async (
  fetchSessionStatus: () => Promise<ReflectionStatus>,
  options: WaitForReflectionOptions = {}
): Promise<ReflectionStatus> => {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await fetchSessionStatus();

    if (TERMINAL_STATUSES.has(status)) {
      return status;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for reflection after ${timeoutMs}ms`);
};
