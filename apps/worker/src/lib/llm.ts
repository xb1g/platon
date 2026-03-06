import type { ReflectionData } from './store-reflection.js';

type ReflectableSession = {
  sessionId: string;
  task: { summary: string };
  outcome: { status: string; summary: string };
  errors?: Array<{ message: string }>;
  events?: Array<{ summary: string }>;
};

export const llmReflect = async (data: ReflectableSession): Promise<ReflectionData> => {
  const wentWrong =
    data.outcome.status === 'failed'
      ? [data.outcome.summary, ...(data.errors?.map((error) => error.message) ?? [])].filter(Boolean)
      : [];

  const wentWell =
    data.outcome.status === 'success'
      ? [data.outcome.summary]
      : data.events?.map((event) => event.summary).filter(Boolean) ?? [];

  const learnings = [
    {
      title:
        data.outcome.status === 'failed'
          ? `Avoid repeat failure: ${data.task.summary}`
          : `Repeat successful pattern: ${data.task.summary}`,
      confidence: data.outcome.status === 'failed' ? 0.72 : 0.84,
    },
  ];

  return {
    sessionId: data.sessionId,
    taskSummary: data.task.summary,
    outcomeSummary: data.outcome.summary,
    wentWell,
    wentWrong,
    likelyCauses: wentWrong.length > 0 ? ['The previous run encountered an unresolved execution issue.'] : [],
    reusableTactics:
      wentWrong.length > 0 ? ['Retry after validating dependencies and prior failure context.'] : ['Reuse the successful execution path.'],
    learnings,
    confidence: learnings[0]?.confidence ?? 0.7,
  };
};
