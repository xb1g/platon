import type { RetrievalResult } from '@memory/shared';
import { detectSuspiciousText } from '../security/detect-suspicious-memory.js';

const EXA_BASE_URL = 'https://api.exa.ai';
const EXA_TIMEOUT_MS = 8_000;

type ExaResult = {
  id: string;
  url: string;
  title?: string;
  score?: number;
  publishedDate?: string;
  text?: string;
};

type ExaSearchResponse = {
  results: ExaResult[];
};

export const exaSearch = async (
  query: string,
  limit: number,
  deps?: { apiKey?: string; fetchImpl?: typeof fetch }
): Promise<RetrievalResult[]> => {
  const apiKey = deps?.apiKey ?? process.env.EXA_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await (deps?.fetchImpl ?? fetch)(`${EXA_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(EXA_TIMEOUT_MS),
      body: JSON.stringify({
        query,
        numResults: limit,
        contents: { text: { maxCharacters: 500 } },
      }),
    });

    if (!response.ok) return [];

    const json = (await response.json()) as ExaSearchResponse;

    return json.results
      .map((result): RetrievalResult => ({
        id: `exa:${result.id}`,
        type: 'learning',
        title: result.title ?? result.url,
        summary: result.text?.slice(0, 500) ?? result.url,
        confidence: result.score ?? 0.5,
        reasons: [
          {
            kind: 'semantic_similarity',
            summary: 'Web context retrieved by Exa search to supplement agent memory.',
            score: Number((result.score ?? 0.5).toFixed(4)),
          },
        ],
        sourceProvenance: [],
      }))
      .filter((result) => !detectSuspiciousText(`${result.title}\n${result.summary}`));
  } catch {
    return [];
  }
};
