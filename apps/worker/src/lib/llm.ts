import type { StoredSessionPayload } from './session-store.js';
import type { ReflectionData } from './store-reflection.js';
import { createReflectionPrompt } from './reflection-prompt.js';
import { parseReflectionModelOutput } from './reflection-schema.js';

export type ReflectableSession = StoredSessionPayload;

export type LlmReflectDeps = {
  invokeModel?: (prompt: string, context: { attempt: number; signal: AbortSignal }) => Promise<string>;
  maxAttempts?: number;
  timeoutMs?: number;
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 15_000);
const DEFAULT_MAX_ATTEMPTS = Number(process.env.REFLECTION_MAX_ATTEMPTS ?? 3);

const getContentText = (content: unknown): string | null => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (
          item &&
          typeof item === 'object' &&
          'type' in item &&
          (item as { type?: string }).type === 'text' &&
          'text' in item &&
          typeof (item as { text?: string }).text === 'string'
        ) {
          return (item as { text: string }).text;
        }

        return '';
      })
      .join('');

    return text.trim().length > 0 ? text : null;
  }

  return null;
};

const createDefaultModelInvoker =
  (timeoutMs: number): NonNullable<LlmReflectDeps['invokeModel']> =>
  async (prompt, context) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for model-backed reflection.');
    }

    const response = await fetch(`${DEFAULT_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      signal: context.signal ?? AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You convert autonomous agent session transcripts into strict JSON reflections for memory storage.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Reflection model request failed with status ${response.status}: ${body}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = getContentText(json.choices?.[0]?.message?.content);

    if (!content) {
      throw new Error('Reflection model response did not include message content.');
    }

    return content;
  };

export const llmReflect = async (
  data: ReflectableSession,
  deps?: LlmReflectDeps
): Promise<ReflectionData> => {
  const prompt = createReflectionPrompt(data);
  const maxAttempts = Math.max(1, deps?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const timeoutMs = deps?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const invokeModel = deps?.invokeModel ?? createDefaultModelInvoker(timeoutMs);

  let lastParseError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const signal = AbortSignal.timeout(timeoutMs);
    const rawOutput = await invokeModel(prompt, { attempt, signal });

    try {
      const structured = parseReflectionModelOutput(rawOutput);

      return {
        sessionId: data.sessionId,
        taskSummary: data.task.summary,
        outcomeSummary: data.outcome.summary,
        ...structured,
      };
    } catch (error) {
      lastParseError = error;
    }
  }

  const suffix = lastParseError instanceof Error ? ` Last error: ${lastParseError.message}` : '';
  throw new Error(`Reflection model returned invalid structured output after ${maxAttempts} attempts.${suffix}`);
};
