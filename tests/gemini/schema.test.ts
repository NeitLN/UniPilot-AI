import { describe, expect, it } from "vitest";
import { parseGeminiPlanResponse } from "@/lib/gemini/schema";

describe("parseGeminiPlanResponse", () => {
  it("parses clean JSON", () => {
    const raw = JSON.stringify({
      sessions: [
        {
          assignmentId: "a1",
          startAt: "2026-08-01T09:00:00.000Z",
          endAt: "2026-08-01T10:00:00.000Z",
          reason: "High priority",
        },
      ],
    });
    const result = parseGeminiPlanResponse(raw);
    expect(result?.sessions).toHaveLength(1);
    expect(result?.sessions[0].assignmentId).toBe("a1");
  });

  it("strips a ```json fence the model added anyway", () => {
    const raw = "```json\n" + JSON.stringify({ sessions: [] }) + "\n```";
    expect(parseGeminiPlanResponse(raw)).toEqual({ sessions: [] });
  });

  it("strips a bare ``` fence with no language tag", () => {
    const raw = "```\n" + JSON.stringify({ sessions: [] }) + "\n```";
    expect(parseGeminiPlanResponse(raw)).toEqual({ sessions: [] });
  });

  it("returns null instead of throwing on garbage input", () => {
    expect(parseGeminiPlanResponse("not json at all")).toBeNull();
  });

  it("returns null when the top-level shape is wrong", () => {
    expect(parseGeminiPlanResponse(JSON.stringify({ notSessions: [] }))).toBeNull();
  });

  it("silently drops malformed entries instead of failing the whole batch", () => {
    const raw = JSON.stringify({
      sessions: [
        {
          assignmentId: "a1",
          startAt: "2026-08-01T09:00:00.000Z",
          endAt: "2026-08-01T10:00:00.000Z",
        },
        { assignmentId: "a2" }, // missing startAt/endAt
        "garbage",
      ],
    });
    const result = parseGeminiPlanResponse(raw);
    expect(result?.sessions).toHaveLength(1);
    expect(result?.sessions[0].assignmentId).toBe("a1");
  });

  it("defaults a missing reason to an empty string", () => {
    const raw = JSON.stringify({
      sessions: [
        {
          assignmentId: "a1",
          startAt: "2026-08-01T09:00:00.000Z",
          endAt: "2026-08-01T10:00:00.000Z",
        },
      ],
    });
    expect(parseGeminiPlanResponse(raw)?.sessions[0].reason).toBe("");
  });
});
