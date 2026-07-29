import { createClient } from "@/lib/supabase/server";
import { weeklyStats } from "@/lib/rules/focus";
import { KpiCard } from "./KpiCard";

export async function FocusWeekKpi() {
  const supabase = await createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data } = await supabase
    .from("focus_sessions")
    .select("assignment_id, started_at, duration_seconds, result")
    .gte("started_at", sevenDaysAgo.toISOString());

  const sessions = (data ?? []).map((s) => ({
    assignmentId: s.assignment_id,
    startedAt: s.started_at,
    durationSeconds: s.duration_seconds,
    result: s.result,
  }));
  const stats = weeklyStats(sessions);

  return (
    <KpiCard
      tone="mint"
      label="Focus this week"
      value={String(stats.completedCycles)}
      unit="cycles"
      hint={`${stats.completedMinutes} min completed`}
    />
  );
}
