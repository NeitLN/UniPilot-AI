import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeAndStoreRisk } from "@/lib/risk/compute";
import { riskGateReasons, topSuggestion } from "@/lib/rules/risk";
import { pickPiloAssignment } from "@/lib/rules/assignment";
import { CheckCircle2, ShieldCheck, Settings2 } from "lucide-react";
import { Pilo } from "@/components/brand/Pilo";
import { WarningActions } from "@/components/risk/WarningActions";
import { RiskBalanceHero } from "@/components/risk/RiskBalanceHero";
import { RefreshScoreButton } from "@/components/risk/RefreshScoreButton";
import { EvidenceCard } from "@/components/risk/EvidenceCard";
import { RiskTrendChart, type RiskTrendPoint } from "@/components/risk/RiskTrendChart";
import { PiloSuggestionCard } from "@/components/risk/PiloSuggestionCard";
import { ALighterWeek, type LighterWeekAction } from "@/components/risk/ALighterWeek";

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
    const metCount = 3 - reasons.length;
    return (
      <div className="flex flex-col gap-3.5">
        <Header />
        <div className="flex flex-col items-center gap-3 rounded-card bg-card py-12 text-center">
          <Pilo mood="sleepy" size={72} />
          <p className="max-w-sm text-sm font-semibold text-ink-2">
            Not enough data yet — {metCount} of 3 requirements met:
          </p>
          <ul className="flex w-full max-w-sm flex-col gap-1.5 text-left text-[12.5px] font-semibold text-ink-3">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 rounded-ctl bg-line px-3 py-2">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-3">
                  ○
                </span>
                <span>
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
                      <Link href="/assignments" className="font-extrabold text-violet hover:underline">
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
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const { result, scoreId, evidence } = computation;
  const suggestion = topSuggestion(result);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoKey = sevenDaysAgo.toISOString().slice(0, 10);

  const [{ data: scoreRow }, { data: warning }, { data: trendRows }, { data: activeAssignments }] = await Promise.all([
    supabase.from("risk_scores").select("computed_at").eq("id", scoreId).single(),
    supabase
      .from("risk_warnings")
      .select("id, status")
      .eq("risk_score_id", scoreId)
      .maybeSingle(),
    supabase
      .from("risk_scores")
      .select("score_date, score")
      .gte("score_date", sevenDaysAgoKey)
      .order("score_date", { ascending: true }),
    supabase
      .from("assignments")
      .select("id, title, due_at, priority, status, archived_at")
      .is("archived_at", null)
      .neq("status", "done"),
  ]);

  const trendPoints: RiskTrendPoint[] = (trendRows ?? []).map((r) => ({ scoreDate: r.score_date, score: r.score }));

  const suggestionTarget = pickPiloAssignment(
    (activeAssignments ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      dueAt: a.due_at,
      priority: a.priority,
      status: a.status,
      archivedAt: a.archived_at,
    })),
    new Date(),
  );

  const lighterWeekActions: LighterWeekAction[] = [];
  if (evidence.overdueCount > 0) {
    lighterWeekActions.push({
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
      label: suggestionTarget ? `Clear "${suggestionTarget.title}"` : `Clear ${evidence.overdueCount} overdue task${evidence.overdueCount === 1 ? "" : "s"}`,
      href: suggestionTarget ? `/focus?assignment=${suggestionTarget.id}` : "/assignments",
    });
  }
  if (evidence.plannedHours < evidence.availableHours * 0.5) {
    lighterWeekActions.push({
      icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />,
      label: "Protect focus blocks with a study plan",
      href: "/planner",
    });
  }
  lighterWeekActions.push({
    icon: <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />,
    label: "Adjust your weekly availability",
    href: "/settings",
  });

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Header />
        <RefreshScoreButton />
      </div>

      <RiskBalanceHero result={result} computedAt={scoreRow?.computed_at ?? null} />

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          <EvidenceCard result={result} evidence={evidence} />
          <RiskTrendChart points={trendPoints} />
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <PiloSuggestionCard suggestion={suggestion} target={suggestionTarget} />
          {warning?.status === "open" && (
            <div className="rounded-card-sm bg-card p-4">
              <p className="text-[12.5px] font-semibold text-ink-2">Handled this already?</p>
              <WarningActions warningId={warning.id} actionTaken={suggestion.message} />
            </div>
          )}
          {warning && warning.status !== "open" && (
            <p className="text-center text-[12.5px] font-bold text-ink-3">
              {warning.status === "handled" ? "Marked as handled." : "Dismissed for now."}
            </p>
          )}
          <ALighterWeek actions={lighterWeekActions} />
        </div>
      </div>
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
