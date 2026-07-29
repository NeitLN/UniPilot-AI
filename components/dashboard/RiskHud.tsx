import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeAndStoreRisk } from "@/lib/risk/compute";
import type { RiskResult } from "@/lib/rules/risk";

const FACTORS = [
  { key: "workload", label: "Workload", tone: "bg-tangerine" },
  { key: "overdue", label: "Overdue", tone: "bg-coral" },
  { key: "focus", label: "Focus", tone: "bg-lime" },
] as const satisfies { key: keyof Pick<RiskResult, "workload" | "overdue" | "focus">; label: string; tone: string }[];

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

  return (
    <div className="flex flex-col gap-4 rounded-card bg-ink px-6 py-5 text-white sm:flex-row sm:items-center">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-[19px] font-bold">Workload risk</h2>
          <span
            className={`rounded-pill px-2.5 py-1 text-[11.5px] font-extrabold ${
              !result
                ? "bg-tangerine-tint text-tangerine-text"
                : result.warn
                  ? "bg-coral-deep text-white"
                  : "bg-mint text-mint-text"
            }`}
          >
            {!result ? "Not enough data" : `Score ${result.score}`}
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
          className="flex min-h-11 shrink-0 items-center justify-center rounded-ctl bg-lime px-4 py-2.5 text-center text-[13px] font-extrabold text-ink hover:bg-lime-deep sm:self-center"
        >
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
