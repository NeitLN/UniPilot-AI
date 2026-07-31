import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import { streakDays, weeklyStats, formatMinutes, defaultTimeZone } from "@/lib/rules/focus";
import { weekOverWeek } from "@/lib/rules/insights";

const DAY_MS = 86_400_000;

/** UX4-04 (docs/PRODUCT_REVIEW_4.md) — the plain-text "See your weekly
 * report" link tested as easy to miss, especially on mobile (Weekly report
 * has no bottom-nav entry — deliberately, see Phase 5). Streak and this-
 * week's minutes are already visible elsewhere on the Dashboard (FocusCard,
 * FocusWeekKpi), so duplicating those exact numbers here wouldn't add
 * anything; the one thing only /reports actually computes is the
 * week-over-week comparison, so that's what this teaser leads with. */
export async function WeeklyReportTeaser() {
  const supabase = await createClient();
  const timeZone = (await getViewerTimeZone()) ?? defaultTimeZone();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS);

  const { data: sessionRows } = await supabase
    .from("focus_sessions")
    .select("assignment_id, started_at, duration_seconds, result, source")
    .gte("started_at", fourteenDaysAgo.toISOString());

  const sessions = (sessionRows ?? []).map((s) => ({
    assignmentId: s.assignment_id,
    startedAt: s.started_at,
    durationSeconds: s.duration_seconds,
    result: s.result,
    source: s.source,
  }));

  const currentWeek = weeklyStats(sessions, { now, timeZone });
  const previousWeek = weeklyStats(sessions, { now: oneWeekAgo, timeZone });
  const streak = streakDays(sessions, { today: now, timeZone });
  const minutesDelta = weekOverWeek(currentWeek.completedMinutes, previousWeek.completedMinutes);

  return (
    <Link
      href="/reports"
      className="flex min-h-11 items-center justify-between gap-3 rounded-card bg-card p-4 hover:bg-line"
    >
      <div className="flex items-center gap-4">
        <p className="text-sm font-bold text-foreground">See your weekly report</p>
        {minutesDelta.direction !== "flat" && (
          <span
            className={`rounded-pill px-2 py-0.5 text-[11px] font-extrabold ${
              minutesDelta.direction === "up"
                ? "bg-mint-tint text-mint-text"
                : "bg-coral-tint text-coral-text"
            }`}
          >
            {minutesDelta.direction === "up" ? "↑" : "↓"}{" "}
            {formatMinutes(Math.abs(minutesDelta.delta))} vs last week
          </span>
        )}
        {streak > 0 && (
          <span className="text-[11px] font-bold text-ink-3">{streak}d streak</span>
        )}
      </div>
      <span aria-hidden="true" className="shrink-0 text-ink-3">
        →
      </span>
    </Link>
  );
}

export function WeeklyReportTeaserSkeleton() {
  return <div className="h-[52px] animate-pulse rounded-card bg-card" />;
}
