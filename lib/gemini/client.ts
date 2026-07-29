import "server-only";

// TC-03: the API key never reaches the client — this file only runs from
// the /api/plan/generate Route Handler.

const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 15_000; // NFR-02: a still-running request times out and shows Retry at 15s

export class GeminiTimeoutError extends Error {
  constructor() {
    super("Gemini request timed out.");
    this.name = "GeminiTimeoutError";
  }
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

interface GeminiApiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/** Raw text from the model — parsing/validation happens in schema.ts. */
export async function generatePlanJson(prompt: string): Promise<string> {
  const apiKey = env("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `${ENDPOINT_BASE}/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            // gemini-2.5-flash defaults to thinking on, which took ~18s on a
            // realistic prompt in testing — disabled since this task is a
            // well-specified structured-output job, not one needing deep
            // reasoning (the server re-validates every session anyway).
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
    }

    const body: GeminiApiResponse = await res.json();
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned no content.");
    }
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new GeminiTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
