import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { canCompute, computeRisk, type RiskGateInput, type RiskResult } from "@/lib/rules/risk";

/** Raw inputs behind the score — never a second definition of the formula,
 * just the same numbers already computed below, surfaced so the "What's
 * shaping your score" evidence card (Step 6.3) can cite them directly. */
export interface RiskEvidence {
  availableHours: number;
  plannedHours: number;
  pendingCount: number;
  overdueCount: number;
  completedCycles7d: number;
  completedFocusMinutes7d: number;
}

export type RiskComputeResult =
  | { status: "insufficient_data"; gate: RiskGateInput }
  | { status: "ok"; result: RiskResult; scoreId: string; evidence: RiskEvidence };

/** Exported so a caller comparing against stored rows keys off exactly the
 * same local date this writes them under — deriving it twice is how the
 * two quietly disagree across a midnight boundary. */
export function todayDateString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Recomputes today's risk score (idempotent — upserts on the unique
 * (user_id, score_date) constraint, so calling this on every dashboard/risk
 * page load just keeps today's row fresh instead of creating duplicates).
 * Creates an in-app warning on first crossing the threshold that day; a
 * push notification would be attempted here too, but delivery lands in
 * Phase 9 — the warning row itself is what FR-16 requires to survive
 * regardless of push success.
 */
export const computeAndStoreRisk = cache(async function computeAndStoreRisk(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RiskComputeResult> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  // The gate only needs to know whether >=7 distinct days have focus
  // history, not the full lifetime of the table — 30 days is a wide-enough
  // window that it can never itself become the reason the gate fails, but
  // it stops this query from growing unbounded as sessions pile up (P-02).
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: profile },
    { data: pendingAssignments },
    { data: overdueAssignments },
    { data: focusHistoryRows },
    { data: recentFocusSessions },
    { data: activePlan },
  ] = await Promise.all([
    supabase.from("profiles").select("weekly_availability_hours").maybeSingle(),
    supabase.from("assignments").select("id").is("archived_at", null).neq("status", "done"),
    supabase
      .from("assignments")
      .select("id")
      .is("archived_at", null)
      .neq("status", "done")
      .lt("due_at", now.toISOString()),
    supabase
      .from("focus_sessions")
      .select("started_at")
      .gte("started_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("focus_sessions")
      .select("result, duration_seconds")
      .gte("started_at", sevenDaysAgo.toISOString()),
    supabase
      .from("study_plans")
      .select("id")
      .eq("status", "active")
      .order("confirmed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const availableHours = profile?.weekly_availability_hours ?? 0;
  const pendingCount = pendingAssignments?.length ?? 0;
  const overdueCount = overdueAssignments?.length ?? 0;
  const focusHistoryDays = new Set((focusHistoryRows ?? []).map((r) => r.started_at.slice(0, 10)))
    .size;
  const completedFocusSessions7d = (recentFocusSessions ?? []).filter(
    (s) => s.result === "completed",
  );
  const completedCycles7d = completedFocusSessions7d.length;
  const completedFocusMinutes7d = Math.round(
    completedFocusSessions7d.reduce((sum, s) => sum + s.duration_seconds / 60, 0),
  );

  let plannedHours = 0;
  if (activePlan) {
    const { data: sessions } = await supabase
      .from("study_sessions")
      .select("start_at, end_at")
      .eq("plan_id", activePlan.id);
    plannedHours = (sessions ?? []).reduce(
      (sum, s) => sum + (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / 3_600_000,
      0,
    );
  }

  if (!canCompute({ availableHours, pendingCount, focusHistoryDays })) {
    return {
      status: "insufficient_data",
      gate: { availableHours, pendingCount, focusHistoryDays },
    };
  }

  const result = computeRisk({
    plannedHours,
    availableHours,
    overdueCount,
    completedCycles7d,
  });

  const { data: scoreRow, error: scoreError } = await supabase
    .from("risk_scores")
    .upsert(
      {
        user_id: userId,
        score_date: todayDateString(),
        workload_factor: result.workload,
        overdue_factor: result.overdue,
        focus_factor: result.focus,
        score: result.score,
        computed_at: now.toISOString(),
      },
      { onConflict: "user_id,score_date" },
    )
    .select("id")
    .single();

  if (scoreError || !scoreRow) {
    throw new Error(scoreError?.message ?? "Couldn't save the risk score.");
  }

  if (result.warn) {
    // Upsert-ignore instead of select-then-insert: this function runs
    // concurrently from the dashboard KPI, the RiskHud, and the /risk page
    // in the same render pass, and a check-then-act here previously raced
    // into duplicate warnings for the same score (see migration 0005).
    // ignoreDuplicates also means a warning the user already dismissed or
    // handled today doesn't get silently reset back to "open".
    const { data: insertedWarning, error: warningError } = await supabase
      .from("risk_warnings")
      .upsert(
        { user_id: userId, risk_score_id: scoreRow.id, status: "open" },
        { onConflict: "risk_score_id", ignoreDuplicates: true },
      )
      .select("id");
    if (warningError) {
      throw new Error(warningError.message);
    }

    // Only the very first time this score crosses the threshold today —
    // ignoreDuplicates means `insertedWarning` is empty on every later call.
    if (insertedWarning && insertedWarning.length > 0) {
      // Settings → Notifications → "Workload warnings" (notification_preferences,
      // migration 0016). The risk_warnings row itself is still created above
      // regardless — that's what drives the in-app warning banner/dismiss
      // flow (FR-16) — only the notification (push/in-app bell) is gated.
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("workload_warnings")
        .eq("user_id", userId)
        .maybeSingle();
      if (prefs?.workload_warnings !== false) {
        await supabase.from("notifications").insert({
          user_id: userId,
          kind: "risk_warning",
          title: "Workload risk is elevated",
          body: `Today's score is ${result.score} — see the Workload risk page for suggestions.`,
          scheduled_at: now.toISOString(),
        });
      }
    }
  }

  return {
    status: "ok",
    result,
    scoreId: scoreRow.id,
    evidence: {
      availableHours,
      plannedHours,
      pendingCount,
      overdueCount,
      completedCycles7d,
      completedFocusMinutes7d,
    },
  };
});
