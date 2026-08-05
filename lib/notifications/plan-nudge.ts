import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { dayKey, defaultTimeZone } from "@/lib/rules/focus";
import {
  daysLeftInPlanWeek,
  planNudgeDecision,
  planNudgeMessage,
  PLAN_NUDGE_MIN_DAYS_LEFT,
} from "@/lib/rules/plan-nudge";

/**
 * PROD-02 — creates the in-week "your plan is slipping" notification for
 * every user whose active plan warrants one. Runs from the notifications
 * cron, immediately before the delivery sweep, so a nudge created on this
 * pass goes out on the same pass.
 *
 * Written as four batched queries rather than a loop over users. The set
 * here is "everyone with an active plan", which grows with the whole user
 * base — a per-user round trip would be the same N+1 shape the audit
 * flagged in lib/calendar/push.ts, except on a path nobody is watching
 * because it runs unattended.
 *
 * Known limitation, deliberate: adherence matches a planned session to a
 * completed focus session by calendar day, and the calendar in question
 * needs a timezone. Everywhere else that comes from the viewer's cookie
 * (lib/timezone.ts) — but there is no viewer here, so this uses the
 * server's. For a student far from the server's zone a session finished
 * near midnight can land on the neighbouring day, moving `kept` by one.
 * Left alone rather than papered over with a fuzzy match, because the
 * nudge quoting a different number than the Weekly report shows would be
 * the worse failure. The 3-session floor and the 50% bar mean a one-session
 * error rarely flips the decision.
 */

export interface PlanNudgeSweepResult {
  /** Active plans that were in the window worth judging at all. */
  considered: number;
  /** Notifications created on this pass — excludes ones the dedupe index
   * refused, so a second run in the same week reports 0. */
  created: number;
  /** Users who qualified but have the category switched off. */
  optedOut: number;
}

export async function sweepPlanNudges(
  supabase: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<PlanNudgeSweepResult> {
  const empty: PlanNudgeSweepResult = { considered: 0, created: 0, optedOut: 0 };

  const { data: plans } = await supabase
    .from("study_plans")
    .select("id, user_id, week_start")
    .eq("status", "active");

  // Drop the plans there is no point costing a query over: weeks already
  // into their tail (or finished), and weeks that have not started.
  const live = (plans ?? []).filter((p) => {
    const daysLeft = daysLeftInPlanWeek(p.week_start, now);
    return daysLeft >= PLAN_NUDGE_MIN_DAYS_LEFT && daysLeft <= 7;
  });
  if (live.length === 0) return empty;

  const planIds = live.map((p) => p.id);
  const userIds = [...new Set(live.map((p) => p.user_id))];
  const earliestWeekStart = live.map((p) => `${p.week_start.slice(0, 10)}T00:00:00.000Z`).sort()[0];

  const [{ data: planned }, { data: focus }, { data: prefs }] = await Promise.all([
    supabase.from("study_sessions").select("plan_id, start_at").in("plan_id", planIds),
    supabase
      .from("focus_sessions")
      .select("user_id, started_at")
      .eq("result", "completed")
      .in("user_id", userIds)
      .gte("started_at", earliestWeekStart),
    supabase.from("notification_preferences").select("user_id, plan_nudges").in("user_id", userIds),
  ]);

  const timeZone = defaultTimeZone();

  const plannedByPlan = new Map<string, string[]>();
  for (const row of planned ?? []) {
    const list = plannedByPlan.get(row.plan_id);
    if (list) list.push(row.start_at);
    else plannedByPlan.set(row.plan_id, [row.start_at]);
  }

  const focusDaysByUser = new Map<string, Set<string>>();
  for (const row of focus ?? []) {
    const set = focusDaysByUser.get(row.user_id);
    const key = dayKey(new Date(row.started_at), timeZone);
    if (set) set.add(key);
    else focusDaysByUser.set(row.user_id, new Set([key]));
  }

  // Absent row means "not configured", which the whole app reads as on —
  // same `!== false` test lib/risk/compute.ts uses for workload warnings.
  const optedOutUsers = new Set(
    (prefs ?? []).filter((p) => p.plan_nudges === false).map((p) => p.user_id),
  );

  const rows: Database["public"]["Tables"]["notifications"]["Insert"][] = [];
  let optedOut = 0;

  for (const plan of live) {
    const starts = plannedByPlan.get(plan.id) ?? [];
    const elapsed = starts.filter((s) => new Date(s).getTime() <= now.getTime());
    const focusDays = focusDaysByUser.get(plan.user_id) ?? new Set<string>();
    const kept = elapsed.filter((s) => focusDays.has(dayKey(new Date(s), timeZone))).length;

    const decision = planNudgeDecision({
      elapsed: elapsed.length,
      kept,
      daysLeftInWeek: daysLeftInPlanWeek(plan.week_start, now),
    });
    if (!decision.nudge) continue;

    // Counted only once the plan has actually earned a nudge, so the
    // preference is not credited with suppressing something that was never
    // going to fire.
    if (optedOutUsers.has(plan.user_id)) {
      optedOut++;
      continue;
    }

    const { title, body } = planNudgeMessage(decision);
    rows.push({
      user_id: plan.user_id,
      kind: "plan_nudge",
      title,
      body,
      scheduled_at: now.toISOString(),
      // One per user per plan week. The unique index (migration 0021) is
      // what enforces it; this is just the key it keys on.
      dedupe_key: plan.week_start.slice(0, 10),
    });
  }

  if (rows.length === 0) return { considered: live.length, created: 0, optedOut };

  const { data: inserted } = await supabase
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,kind,dedupe_key", ignoreDuplicates: true })
    .select("id");

  return { considered: live.length, created: inserted?.length ?? 0, optedOut };
}
