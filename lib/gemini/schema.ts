// Types + a safe parser for whatever Gemini hands back. Never throws on
// malformed model output — returns null so the caller can show a retry
// instead of crashing (TC-03).

export interface GeminiSessionSuggestion {
  assignmentId: string;
  startAt: string;
  endAt: string;
  reason: string;
}

export interface GeminiPlanResponse {
  sessions: GeminiSessionSuggestion[];
}

function isSessionSuggestion(value: unknown): value is GeminiSessionSuggestion {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.assignmentId === "string" &&
    typeof v.startAt === "string" &&
    typeof v.endAt === "string" &&
    (typeof v.reason === "string" || v.reason === undefined)
  );
}

/** Strips a ```json fence if the model added one anyway, then parses. */
export function parseGeminiPlanResponse(raw: string): GeminiPlanResponse | null {
  const stripped = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();

  let data: unknown;
  try {
    data = JSON.parse(stripped);
  } catch {
    return null;
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as Record<string, unknown>).sessions)
  ) {
    return null;
  }

  const sessions = (data as { sessions: unknown[] }).sessions
    .filter(isSessionSuggestion)
    .map((s) => ({
      assignmentId: s.assignmentId,
      startAt: s.startAt,
      endAt: s.endAt,
      reason: s.reason || "",
    }));

  return { sessions };
}
