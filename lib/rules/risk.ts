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
  focus:
    "Your focus habit has slipped this week — try a Pomodoro session to rebuild momentum.",
};

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
