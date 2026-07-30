import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeAndStoreRisk } from "@/lib/risk/compute";
import { riskGateReasons, topSuggestion } from "@/lib/rules/risk";
import { Pilo } from "@/components/brand/Pilo";
import { WarningActions } from "@/components/risk/WarningActions";

const FACTOR_TONE = {
  workload: "bg-tangerine-tint text-tangerine-text",
  overdue: "bg-coral-tint text-coral-text",
  // bg-lime-tint deliberately never darkens (see globals.css) — pair it with
  // the fixed --ink shade, not --foreground, or the text goes invisible
  // once --foreground flips light under `.dark`.
  focus: "bg-lime-tint text-ink",
} as const;

export default async function RiskPage() {
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

  if (computation.status !== "ok") {
    const reasons = riskGateReasons(computation.gate);
    return (
      <div className="flex flex-col gap-3.5">
        <Header />
        <div className="flex flex-col items-center gap-3 rounded-card bg-card py-12 text-center">
          <Pilo mood="sleepy" size={72} />
          <p className="max-w-sm text-sm font-semibold text-ink-2">
            Not enough data yet — the score needs all three of these:
          </p>
          <ul className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink-3">
            {reasons.map((r) => (
              <li key={r}>
                {r}
                {r.includes("weekly availability") && (
                  <>
                    {" "}
                    <Link href="/settings" className="font-extrabold text-violet hover:underline">
                      Set it now →
                    </Link>
                  </>
                )}
                {r.includes("Add at least one assignment") && (
                  <>
                    {" "}
                    <Link
                      href="/assignments"
                      className="font-extrabold text-violet hover:underline"
                    >
                      Add one now →
                    </Link>
                  </>
                )}
                {r.includes("Log focus sessions") && (
                  <>
                    {" "}
                    <Link href="/focus" className="font-extrabold text-violet hover:underline">
                      Start a session →
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const { result, scoreId } = computation;
  const suggestion = topSuggestion(result);

  const [{ data: scoreRow }, { data: warning }] = await Promise.all([
    supabase.from("risk_scores").select("computed_at").eq("id", scoreId).single(),
    supabase
      .from("risk_warnings")
      .select("id, status")
      .eq("risk_score_id", scoreId)
      .maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-3.5">
      <Header />

      <div className="rounded-card bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-4xl font-bold text-foreground tabular-nums">
              {result.score}
            </p>
            <p className="mt-1 text-[11.5px] font-semibold text-ink-3">
              Warning threshold: 60 · computed{" "}
              {scoreRow?.computed_at
                ? new Date(scoreRow.computed_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "just now"}
            </p>
          </div>
          <span
            className={`rounded-pill px-3 py-1.5 text-[12px] font-extrabold ${
              result.warn
                ? "bg-coral-tint text-coral-text"
                : "bg-mint-tint text-mint-text"
            }`}
          >
            {result.warn ? "Above threshold" : "Within range"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FactorCard label="Workload" weight="×0.40" value={result.workload} tone="workload" />
          <FactorCard label="Overdue" weight="×0.35" value={result.overdue} tone="overdue" />
          <FactorCard label="Focus" weight="×0.25" value={result.focus} tone="focus" />
        </div>

        <p className="mt-4 text-[12.5px] font-semibold text-ink-3">
          Based on this week&rsquo;s planned hours vs. your availability,
          currently overdue assignments, and completed focus cycles from the
          last 7 days.
        </p>
      </div>

      {result.warn && (
        <div className="rounded-card bg-tangerine-tint p-5">
          <h2 className="font-display text-lg font-bold text-foreground">Suggestion</h2>
          <p className="mt-2 text-sm font-semibold text-ink-2">{suggestion.message}</p>

          {warning?.status === "open" && (
            <WarningActions warningId={warning.id} actionTaken={suggestion.message} />
          )}
          {warning && warning.status !== "open" && (
            <p className="mt-3 text-[12.5px] font-bold text-ink-3">
              {warning.status === "handled"
                ? "Marked as handled."
                : "Dismissed for now."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-foreground">
        Workload risk
      </h1>
      <p className="mt-1 text-sm font-semibold text-ink-2">
        Planning aid, not a medical or psychological assessment.
      </p>
    </div>
  );
}

function FactorCard({
  label,
  weight,
  value,
  tone,
}: {
  label: string;
  weight: string;
  value: number;
  tone: keyof typeof FACTOR_TONE;
}) {
  return (
    <div className={`rounded-ctl p-3 ${FACTOR_TONE[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">
        {label} {weight}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
