import Link from "next/link";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeAndStoreRisk, todayDateString } from "@/lib/risk/compute";
import {
  riskDelta,
  riskDeltaLabel,
  type RiskDelta,
  type RiskResult,
} from "@/lib/rules/risk";

const FACTORS = [
  { key: "workload", label: "Workload", tone: "bg-tangerine" },
  { key: "overdue", label: "Overdue", tone: "bg-coral" },
  { key: "focus", label: "Focus", tone: "bg-lime" },
] as const satisfies {
  key: keyof Pick<RiskResult, "workload" | "overdue" | "focus">;
  label: string;
  tone: string;
}[];

/** BR-06: shows "Not enough data" instead of a fake 0 when the gate fails. */
export async function RiskHud() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const computation = user
    ? await computeAndStoreRisk(supabase, user.id)
    : ({
        status: "insufficient_data",
        gate: { availableHours: 0, pendingCount: 0, focusHistoryDays: 0 },
      } as const);

  const result = computation.status === "ok" ? computation.result : null;

  // PROD-01: the score alone does not tell a student anything actionable —
  // 47 is meaningless until you know it was 31 two days ago. computeAndStore
  // has already upserted today's row by this point, so the history read
  // below is guaranteed to see it.
  let delta: RiskDelta = null;
  if (user && result) {
    const { data: history } = await supabase
      .from("risk_scores")
      .select("score_date, score")
      .order("score_date", { ascending: false })
      .limit(14);
    delta = riskDelta(
      result.score,
      todayDateString(),
      (history ?? []).map((h) => ({ scoreDate: h.score_date, score: h.score })),
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-ink px-6 py-5 text-white lg:flex-row lg:items-center">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <h2 className="font-display text-[19px] font-bold">Weekly balance</h2>
          {/* The two pills travel together. The left column is only ~450px
              at lg, so adding the delta pushes this row over — and the
              break has to fall between the heading and the pills rather
              than splitting the score away from its own trend. */}
          <span className="flex flex-wrap items-center gap-2.5">
            <span
              className={`rounded-pill px-2.5 py-1 text-[11.5px] font-extrabold ${
                !result
                  ? "bg-tangerine-tint text-tangerine-text"
                  : result.warn
                    ? "bg-coral-deep text-white"
                    : "bg-lime text-ink"
              }`}
            >
              {!result ? "Not enough data" : `Score ${result.score}`}
            </span>
            {delta && (
              // Up is worse: the score measures overload, not progress. Both
              // states carry their own solid fill, so neither depends on a
              // token that flips between themes (the trap D-03 documents) —
              // and this sits on --ink, which is dark in both.
              <span
                className={`flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11.5px] font-extrabold ${
                  delta.worse ? "bg-coral-deep text-white" : "bg-lime text-ink"
                }`}
              >
                {delta.worse ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {riskDeltaLabel(delta)}
              </span>
            )}
          </span>
        </div>
        <p className="mt-1.5 max-w-[430px] text-[12.5px] font-medium leading-relaxed text-dusk-hud">
          Planning aid, not a medical assessment.{" "}
          {!result
            ? "Needs 7 days of focus history plus your availability and pending work."
            : "See the full breakdown and suggestions on the report."}
        </p>
      </div>

      <div className="flex gap-6">
        {FACTORS.map((f) => {
          const value = result ? result[f.key] : 0;
          const litSegments = result ? Math.round(value / 20) : 0;
          return (
            <div key={f.key} className="w-[104px]">
              <p className="text-[11px] font-bold text-dusk-hud">{f.label}</p>
              <p className="font-display text-base font-bold text-white">
                {result ? value : "—"}
              </p>
              <div className="mt-1.5 flex gap-[3px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-[9px] flex-1 rounded-[3px] ${i < litSegments ? f.tone : "bg-dusk-seg"}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {result && (
        <Link
          href="/risk"
          className="flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-ctl bg-lime px-4 py-2.5 text-center text-[13px] font-extrabold text-ink hover:bg-lime-deep lg:self-center"
        >
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          View report
        </Link>
      )}
    </div>
  );
}

export function RiskHudSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-ink px-6 py-5">
      <div className="h-5 w-40 rounded-full bg-white/15" />
      <div className="mt-3 h-8 w-full max-w-[430px] rounded-full bg-white/10" />
    </div>
  );
}
