import { pickPiloAssignment, type AssignmentLike } from "./assignment";

// BR-06 — daily workload-risk score: gate, weighted formula, and the
// highest-contributing factor's suggestion.
// docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 8.

export interface RiskGateInput {
  availableHours: number;
  pendingCount: number;
  focusHistoryDays: number;
}

/** All three must hold, or the score is "not computed", never a fake 0. */
export function canCompute(i: RiskGateInput): boolean {
  return i.availableHours > 0 && i.pendingCount >= 1 && i.focusHistoryDays >= 7;
}

/** Same gate as canCompute, but names which specific condition(s) are
 * unmet — powers the empty-state message on the Risk page instead of a
 * generic "not enough data". */
export function riskGateReasons(i: RiskGateInput): string[] {
  const reasons: string[] = [];
  if (i.availableHours <= 0) {
    reasons.push("Set your weekly availability hours above 0 in your profile.");
  }
  if (i.pendingCount < 1) {
    reasons.push("Add at least one assignment that isn't done yet.");
  }
  if (i.focusHistoryDays < 7) {
    reasons.push(
      `Log focus sessions on ${7 - i.focusHistoryDays} more day${7 - i.focusHistoryDays === 1 ? "" : "s"} (${i.focusHistoryDays}/7 so far).`,
    );
  }
  return reasons;
}

export interface RiskComputeInput {
  plannedHours: number;
  availableHours: number;
  overdueCount: number;
  completedCycles7d: number;
}

export interface RiskResult {
  workload: number;
  overdue: number;
  focus: number;
  score: number;
  warn: boolean;
}

export function computeRisk(i: RiskComputeInput): RiskResult {
  const workload = Math.min(100, (i.plannedHours / i.availableHours) * 100);
  const overdue = Math.min(100, i.overdueCount * 25);
  const focus = Math.max(0, 100 - i.completedCycles7d * 10);
  const score = Math.round(0.4 * workload + 0.35 * overdue + 0.25 * focus);
  return {
    workload: Math.round(workload),
    overdue: Math.round(overdue),
    focus: Math.round(focus),
    score,
    warn: score >= 60,
  };
}

export type RiskRange = "balanced" | "moderate" | "overloaded";

/**
 * Presentation-only categorization of the same score computeRisk() already
 * produces — the formula and the 60-point warn threshold are untouched
 * (UNIPILOT_8_SCREENS Step 6.2 explicitly forbids changing either). 40 is a
 * new, documented midpoint purely for the hero gauge's 3-way label.
 */
export function riskRange(score: number): RiskRange {
  if (score >= 60) return "overloaded";
  if (score >= 40) return "moderate";
  return "balanced";
}

export type SuggestionType = "workload" | "overdue" | "focus";

export interface Suggestion {
  type: SuggestionType;
  message: string;
}

const WEIGHTS: Record<SuggestionType, number> = {
  workload: 0.4,
  overdue: 0.35,
  focus: 0.25,
};

const MESSAGES: Record<SuggestionType, string> = {
  workload:
    "Your planned hours are packed for what's available — move a study session to a lighter day.",
  overdue:
    "Overdue work is driving this up — negotiate a deadline extension or cut scope on one item.",
  focus: "Your focus habit has slipped this week — try a Pomodoro session to rebuild momentum.",
};

export type ImpactLevel = "strong" | "moderate" | "protective";

/**
 * Evidence card impact badge (Step 6.3) — derived purely from the factor's
 * own value, never hard-coded per card. `focus` is inverted: a *low* focus
 * factor means a healthy focus habit (protective), the opposite of
 * workload/overdue where high is bad.
 */
export function evidenceImpact(type: SuggestionType, value: number): ImpactLevel {
  if (type === "focus") {
    if (value <= 30) return "protective";
    if (value <= 60) return "moderate";
    return "strong";
  }
  if (value >= 70) return "strong";
  if (value >= 40) return "moderate";
  return "protective";
}

/** Ranked by each factor's actual contribution to the score (value × weight). */
export function topSuggestion(
  factors: Pick<RiskResult, "workload" | "overdue" | "focus">,
): Suggestion {
  const ranked = (Object.keys(WEIGHTS) as SuggestionType[])
    .map((type) => ({ type, contribution: factors[type] * WEIGHTS[type] }))
    .sort((a, b) => b.contribution - a.contribution);

  const type = ranked[0].type;
  return { type, message: MESSAGES[type] };
}

/**
 * PROD-01 — the risk *delta*.
 *
 * The audit said workload risk sat behind a sidebar link with no front
 * door. That part was wrong: the dashboard already leads with a full
 * "Weekly balance" HUD carrying the score and all three factors. What it
 * never showed is the one thing a score is nearly useless without —
 * whether it is getting better or worse. 47 means nothing on its own; 47
 * after 31 means something.
 */

/** Below this, a change is noise. The score moves a point or two on
 * ordinary day-to-day variation in pending work, and a HUD that announces
 * every one of those trains people to ignore it. */
export const RISK_DELTA_MIN = 5;

export interface RiskHistoryPoint {
  /** `risk_scores.score_date`, a plain date. */
  scoreDate: string;
  score: number;
}

export type RiskDelta = {
  change: number;
  direction: "up" | "down";
  /** Days between the two readings. Scores are only written on days the
   * app is opened, so this is frequently not 1 and the UI has to say so
   * rather than implying "since yesterday". */
  daysApart: number;
  /** Up is worse here: the score measures overload, not progress. */
  worse: boolean;
} | null;

/**
 * Change from the most recent *earlier* reading to today's score.
 *
 * Compares against the previous reading rather than a fixed "yesterday"
 * because rows only exist for days the student opened the app — on a
 * Monday after a quiet weekend, "yesterday" has no row at all and a
 * yesterday-based delta would silently show nothing exactly when the
 * change is most interesting.
 */
export function riskDelta(
  todayScore: number,
  todayDate: string,
  history: RiskHistoryPoint[],
): RiskDelta {
  const earlier = history
    .filter((p) => p.scoreDate.slice(0, 10) < todayDate.slice(0, 10))
    .sort((a, b) => (a.scoreDate < b.scoreDate ? 1 : -1))[0];
  if (!earlier) return null;

  const change = todayScore - earlier.score;
  if (Math.abs(change) < RISK_DELTA_MIN) return null;

  const daysApart = Math.round(
    (new Date(`${todayDate.slice(0, 10)}T00:00:00Z`).getTime() -
      new Date(`${earlier.scoreDate.slice(0, 10)}T00:00:00Z`).getTime()) /
      86_400_000,
  );

  return {
    change: Math.abs(change),
    direction: change > 0 ? "up" : "down",
    daysApart,
    worse: change > 0,
  };
}

/** "since yesterday" / "over 3 days" — never a bare number the student has
 * to guess the timeframe of. */
export function riskDeltaLabel(delta: NonNullable<RiskDelta>): string {
  const span = delta.daysApart === 1 ? "since yesterday" : `over ${delta.daysApart} days`;
  return `${delta.direction === "up" ? "+" : "−"}${delta.change} ${span}`;
}

/**
 * PROD-01 follow-up — making the suggestion act on something.
 *
 * The card already named an assignment, but it picked one with
 * `pickPiloAssignment`, a general "what should I work on next" tiering that
 * knows nothing about which factor is driving the score. So two of the three
 * factors sent the student somewhere that contradicted the sentence above
 * the button: "negotiate an extension or cut scope" under a button that
 * started a Pomodoro, "move a study session to a lighter day" under the
 * same one. Advice you cannot act on is only marginally better than a bare
 * number, which was the original complaint.
 */

/** Extends the shared shape rather than restating it, so the two picks stay
 * interchangeable and cannot drift apart on a field like `status`. */
export interface RiskTargetLike extends AssignmentLike {
  id: string;
  title: string;
}

export interface SuggestionAction {
  href: string;
  label: string;
}

/**
 * The assignment this factor is actually about.
 *
 * For `overdue` that is the *oldest* thing still outstanding — it has been
 * contributing the longest and is the one the student keeps stepping over.
 * `pickPiloAssignment` deliberately does the opposite (newest overdue
 * first, as the most salvageable), which is right for "what next" and wrong
 * for "what is dragging this score".
 *
 * The other two factors are about the shape of the week rather than one
 * item, so they fall back to the ordinary next-up pick.
 */
export function pickRiskTarget<T extends RiskTargetLike>(
  type: SuggestionType,
  list: T[],
  now: Date = new Date(),
): T | null {
  const active = list.filter((a) => !a.archivedAt && a.status !== "done");
  if (active.length === 0) return null;

  if (type === "overdue") {
    const overdue = active
      .filter((a) => new Date(a.dueAt).getTime() < now.getTime())
      .sort((x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime());
    if (overdue.length > 0) return overdue[0];
  }

  return pickPiloAssignment(active, now);
}

/**
 * Where the button goes, matched to the advice rather than always pointing
 * at the focus timer.
 *
 * `overdue` goes to the assignment itself — rescheduling or cutting scope
 * happens there, not in a timer. `workload` goes to the planner, because
 * moving a session to a lighter day is a planner action and belongs to the
 * week, not to one assignment. `focus` is the one case where starting a
 * session really is the next step.
 */
export function suggestionAction(
  type: SuggestionType,
  target: { id: string; title: string } | null,
): SuggestionAction {
  if (!target) {
    // Nothing outstanding to act on: send them somewhere real rather than
    // preselecting an assignment that does not exist.
    return type === "workload"
      ? { href: "/planner", label: "Open your plan" }
      : { href: "/assignments", label: "Review this week" };
  }

  switch (type) {
    case "overdue":
      // Searched rather than filtered, so the row is findable however many
      // assignments the list is paginating.
      return {
        href: `/assignments?q=${encodeURIComponent(target.title)}`,
        label: `Reschedule ${target.title}`,
      };
    case "workload":
      return { href: "/planner", label: "Move a session in Planner" };
    case "focus":
      return {
        href: `/focus?assignment=${target.id}`,
        label: `Start a session on ${target.title}`,
      };
  }
}
