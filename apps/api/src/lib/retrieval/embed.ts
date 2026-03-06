type EmbedDeps = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  model?: string;
  timeoutMs?: number;
};

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const DEFAULT_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
const DEFAULT_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 15_000);

export const embedText = async (text: string, deps?: EmbedDeps): Promise<number[]> => {
  const apiKey = deps?.apiKey ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for vector embeddings.');
  }

  const response = await (deps?.fetchImpl ?? fetch)(`${(deps?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(deps?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    body: JSON.stringify({
      input: text,
      model: deps?.model ?? DEFAULT_MODEL,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const embedding = json.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.some((value) => typeof value !== 'number')) {
    throw new Error('Embedding response did not contain a numeric embedding vector.');
  }

  return embedding;
};
