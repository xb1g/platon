import type { SessionPayload } from "@memory/shared";

type SuspiciousDetection = {
  reason: "prompt_injection_risk";
  match: string;
};

type RetrievalCandidate = {
  title?: string;
  summary?: string;
  status?: string;
  namespaceMatch?: string;
};

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\bignore previous instructions\b/i,
  /\breveal (?:the )?(?:system|developer) prompt\b/i,
  /\bsystem prompt\b/i,
  /\bdeveloper message\b/i,
  /\bexfiltrat(?:e|ion)\b/i,
  /\bprint .*api key\b/i
];

export const detectSuspiciousText = (value: string): SuspiciousDetection | null => {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = value.match(pattern);

    if (match) {
      return {
        reason: "prompt_injection_risk",
        match: match[0]
      };
    }
  }

  return null;
};

const collectSessionText = (payload: SessionPayload): string[] => [
  payload.inputContextSummary ?? "",
  payload.task.summary,
  payload.outcome.summary,
  ...payload.events.map((event) => event.summary),
  ...payload.errors.map((error) => error.message),
  ...payload.artifacts.flatMap((artifact) => [artifact.kind, artifact.uri, artifact.summary ?? ""]),
  ...(payload.humanFeedback ? [payload.humanFeedback.summary] : [])
];

export const detectSuspiciousSessionPayload = (
  payload: SessionPayload
): SuspiciousDetection | null => {
  for (const value of collectSessionText(payload)) {
    const detection = detectSuspiciousText(value);

    if (detection) {
      return detection;
    }
  }

  return null;
};

export const shouldFilterRetrievedMemory = (candidate: RetrievalCandidate): boolean => {
  if (candidate.namespaceMatch === "cross_namespace") {
    return true;
  }

  if (candidate.status === "quarantined") {
    return true;
  }

  const combinedText = `${candidate.title ?? ""}\n${candidate.summary ?? ""}`.trim();

  if (!combinedText) {
    return false;
  }

  return detectSuspiciousText(combinedText) != null;
};
