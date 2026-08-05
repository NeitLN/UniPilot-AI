import { describe, expect, it } from "vitest";
import { pickRiskTarget, suggestionAction, topSuggestion } from "@/lib/rules/risk";

/**
 * PROD-01 follow-up — the suggestion has to be actionable.
 *
 * The card already named an assignment, but chose it with the general
 * "what next" tiering and always sent the student to the focus timer. So
 * two of three factors put a button under a sentence it contradicted:
 * "negotiate an extension or cut scope" over a button that started a
 * Pomodoro. These pin the pairing, not the wording.
 */

const NOW = new Date("2026-08-05T12:00:00Z");

const a = (id: string, dueAt: string, priority: "low" | "medium" | "high" = "medium") => ({
  id,
  title: `Task ${id}`,
  dueAt,
  priority,
  status: "not_started" as const,
  archivedAt: null,
});

describe("pickRiskTarget", () => {
  const list = [
    a("old", "2026-07-20T09:00:00Z"), // 16 days overdue
    a("recent", "2026-08-04T09:00:00Z"), // 1 day overdue
    a("soon", "2026-08-07T09:00:00Z"), // upcoming
  ];

  it("blames the oldest overdue item, not the most recent one", () => {
    // The opposite of pickPiloAssignment, deliberately: "what is dragging
    // this score" is the thing that has been outstanding longest, while
    // "what should I do next" favours the most salvageable.
    expect(pickRiskTarget("overdue", list, NOW)?.id).toBe("old");
  });

  it("falls back to the ordinary next-up pick for the other factors", () => {
    // Those two are about the shape of the week, not one late item.
    expect(pickRiskTarget("focus", list, NOW)?.id).toBe("recent");
    expect(pickRiskTarget("workload", list, NOW)?.id).toBe("recent");
  });

  it("ignores done and archived work", () => {
    const noisy = [
      { ...a("done", "2026-07-01T09:00:00Z"), status: "done" as const },
      { ...a("archived", "2026-07-02T09:00:00Z"), archivedAt: "2026-07-03T00:00:00Z" },
      a("real", "2026-07-25T09:00:00Z"),
    ];
    expect(pickRiskTarget("overdue", noisy, NOW)?.id).toBe("real");
  });

  it("returns null when there is nothing outstanding", () => {
    expect(pickRiskTarget("overdue", [], NOW)).toBeNull();
  });

  it("still finds a target when overdue is the factor but nothing is late", () => {
    // The factor can dominate on a stale score while the list has since been
    // cleared; the card must not end up empty because of it.
    expect(pickRiskTarget("overdue", [a("soon", "2026-08-09T09:00:00Z")], NOW)?.id).toBe("soon");
  });
});

describe("suggestionAction", () => {
  const target = { id: "abc", title: "Lab 3 report" };

  it("sends an overdue suggestion to the assignment, not to a timer", () => {
    const action = suggestionAction("overdue", target);
    expect(action.href).toBe("/assignments?q=Lab%203%20report");
    expect(action.label).toBe("Reschedule Lab 3 report");
  });

  it("sends a workload suggestion to the planner, where sessions are moved", () => {
    // "Move a study session to a lighter day" is a planner action and
    // belongs to the week, not to any one assignment.
    expect(suggestionAction("workload", target)).toEqual({
      href: "/planner",
      label: "Move a session in Planner",
    });
  });

  it("sends a focus suggestion to a preselected session", () => {
    expect(suggestionAction("focus", target)).toEqual({
      href: "/focus?assignment=abc",
      label: "Start a session on Lab 3 report",
    });
  });

  it("degrades to a real destination when there is nothing to act on", () => {
    // Never a link that preselects an assignment which does not exist.
    expect(suggestionAction("focus", null).href).toBe("/assignments");
    expect(suggestionAction("overdue", null).href).toBe("/assignments");
    expect(suggestionAction("workload", null).href).toBe("/planner");
  });

  it("escapes a title so a query string cannot be broken by punctuation", () => {
    const action = suggestionAction("overdue", { id: "x", title: "Essay #2 & notes" });
    expect(action.href).toBe("/assignments?q=Essay%20%232%20%26%20notes");
  });
});

describe("suggestion and action agree", () => {
  it("every factor the score can name has an action that matches its advice", () => {
    // The defect was a mismatch between the sentence and the button, so the
    // pairing itself is what is worth pinning.
    const cases = [
      { factors: { workload: 90, overdue: 0, focus: 0 }, href: "/planner" },
      { factors: { workload: 0, overdue: 100, focus: 0 }, href: "/assignments?q=Task%20late" },
      { factors: { workload: 0, overdue: 0, focus: 100 }, href: "/focus?assignment=late" },
    ];
    for (const c of cases) {
      const { type } = topSuggestion(c.factors);
      const target = { id: "late", title: "Task late" };
      expect(suggestionAction(type, target).href, `factor ${type}`).toBe(c.href);
    }
  });
});
