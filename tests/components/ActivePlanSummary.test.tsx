import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivePlanSummary } from "@/components/planner/ActivePlanSummary";

// QA4-03 (docs/PRODUCT_REVIEW_4.md) — the exact bug this component was
// found with: a plan whose every session was days in the past rendered an
// identical mint "Active" badge to one with sessions still ahead. This is
// the regression guard for that, at the component level rather than only
// lib/rules/plan.ts's pure-function tests (computePlanProgress was already
// correct in isolation; the bug was in ActivePlanSummary not calling it).
describe("ActivePlanSummary", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("never shows 'Active' when every session is in the past", () => {
    render(
      <ActivePlanSummary
        now={now}
        confirmedAt="2026-07-30T00:00:00.000Z"
        sessions={[
          { id: "1", assignmentTitle: "Essay draft", startAt: "2026-07-26T09:00:00.000Z", endAt: "2026-07-26T10:00:00.000Z" },
          { id: "2", assignmentTitle: "Lab report", startAt: "2026-07-29T09:00:00.000Z", endAt: "2026-07-29T10:00:00.000Z" },
        ]}
      />,
    );
    expect(screen.getByText("Ended")).toBeInTheDocument();
    expect(screen.queryByText("Active", { selector: "span" })).not.toBeInTheDocument();
    expect(screen.getByText(/2 of 2 sessions have passed/)).toBeInTheDocument();
  });

  it("shows 'Active' when at least one session is still upcoming", () => {
    render(
      <ActivePlanSummary
        now={now}
        confirmedAt="2026-07-31T00:00:00.000Z"
        sessions={[
          { id: "1", assignmentTitle: "Essay draft", startAt: "2026-07-29T09:00:00.000Z", endAt: "2026-07-29T10:00:00.000Z" },
          { id: "2", assignmentTitle: "Lab report", startAt: "2026-08-02T09:00:00.000Z", endAt: "2026-08-02T10:00:00.000Z" },
        ]}
      />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Ended")).not.toBeInTheDocument();
    expect(screen.getByText(/1 of 2 sessions have passed/)).toBeInTheDocument();
  });

  it("does not show 'Ended' for a plan with no sessions at all", () => {
    render(<ActivePlanSummary now={now} confirmedAt={null} sessions={[]} />);
    expect(screen.getByText("No sessions on this plan.")).toBeInTheDocument();
    expect(screen.queryByText("Ended")).not.toBeInTheDocument();
  });
});
