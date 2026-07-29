import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { canCompute, computeRisk, type RiskResult } from "@/lib/rules/risk";

export type RiskComputeResult =
  | { status: "insufficient_data" }
  | { status: "ok"; result: RiskResult; scoreId: string };

function todayDateString(): string {
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
export async function computeAndStoreRisk(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RiskComputeResult> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    { data: profile },
    { data: pendingAssignments },
    { data: overdueAssignments },
    { data: focusHistoryRows },
    { data: recentFocusSessions },
    { data: activePlan },
  ] = await Promise.all([
    supabase.from("profiles").select("weekly_availability_hours").maybeSingle(),
    supabase
      .from("assignments")
      .select("id")
      .is("archived_at", null)
      .neq("status", "done"),
    supabase
      .from("assignments")
      .select("id")
      .is("archived_at", null)
      .neq("status", "done")
      .lt("due_at", now.toISOString()),
    supabase.from("focus_sessions").select("started_at"),
    supabase
      .from("focus_sessions")
      .select("result")
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
  const focusHistoryDays = new Set(
    (focusHistoryRows ?? []).map((r) => r.started_at.slice(0, 10)),
  ).size;
  const completedCycles7d = (recentFocusSessions ?? []).filter(
    (s) => s.result === "completed",
  ).length;

  let plannedHours = 0;
  if (activePlan) {
    const { data: sessions } = await supabase
      .from("study_sessions")
      .select("start_at, end_at")
      .eq("plan_id", activePlan.id);
    plannedHours = (sessions ?? []).reduce(
      (sum, s) =>
        sum +
        (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) /
          3_600_000,
      0,
    );
  }

  if (!canCompute({ availableHours, pendingCount, focusHistoryDays })) {
    return { status: "insufficient_data" };
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
    const { error: warningError } = await supabase
      .from("risk_warnings")
      .upsert(
        { user_id: userId, risk_score_id: scoreRow.id, status: "open" },
        { onConflict: "risk_score_id", ignoreDuplicates: true },
      );
    if (warningError) {
      throw new Error(warningError.message);
    }
  }

  return { status: "ok", result, scoreId: scoreRow.id };
}
