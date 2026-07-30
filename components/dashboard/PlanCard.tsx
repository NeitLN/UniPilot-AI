import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Pilo } from "@/components/brand/Pilo";
import { computePlanProgress } from "@/lib/rules/plan";

/** BR-02: the Draft badge always shows for a real draft — never silently active.
 *
 * QA4-03 (docs/PRODUCT_REVIEW_4.md): this card derived "active" purely from
 * study_plans.status, same bug as ActivePlanSummary on the full /planner
 * page — a plan whose every session was days in the past still said "Your
 * weekly study sessions are confirmed and active." Reuses the same
 * computePlanProgress this was already fixed with there, instead of
 * re-deriving a second, possibly-diverging notion of "ended" here. */
export async function PlanCard() {
  const supabase = await createClient();
  const [{ data: draftPlan }, { data: activePlan }] = await Promise.all([
    supabase.from("study_plans").select("id").eq("status", "draft").maybeSingle(),
    supabase
      .from("study_plans")
      .select("id")
      .eq("status", "active")
      .order("confirmed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let lifecycle: "draft" | "active" | "ended" | "none" = draftPlan ? "draft" : "none";
  if (!draftPlan && activePlan) {
    const { data: sessionRows } = await supabase
      .from("study_sessions")
      .select("start_at")
      .eq("plan_id", activePlan.id);
    const progress = computePlanProgress((sessionRows ?? []).map((s) => ({ startAt: s.start_at })));
    lifecycle = progress.lifecycle === "ended" ? "ended" : "active";
  }

  const badgeLabel =
    lifecycle === "draft"
      ? "Draft"
      : lifecycle === "active"
        ? "Active"
        : lifecycle === "ended"
          ? "Ended"
          : "No plan";

  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card">
          <Pilo mood="happy" size={34} />
        </span>
        <h2 className="font-display text-lg font-bold">Pilo&rsquo;s plan</h2>
        <span className="ml-auto shrink-0 rounded-pill bg-white/10 px-2.5 py-1 text-[10.5px] font-extrabold">
          {badgeLabel}
        </span>
      </div>
      <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-white/88">
        {lifecycle === "draft"
          ? "A draft is waiting for your review — nothing is scheduled until you confirm it."
          : lifecycle === "active"
            ? "Your weekly study sessions are confirmed and active."
            : lifecycle === "ended"
              ? "This week's plan has ended — generate a new one when you're ready."
              : "Generate a weekly study plan whenever you're ready."}
      </p>
      <Link
        href="/planner"
        className="mt-4 block w-full rounded-ctl bg-lime py-3 text-center text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        {lifecycle === "draft"
          ? "Review draft"
          : lifecycle === "active"
            ? "View plan"
            : lifecycle === "ended"
              ? "Generate new draft"
              : "Generate plan"}
      </Link>
    </div>
  );
}

export function PlanCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-violet p-5">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-2xl bg-white/30" />
        <div className="h-4 w-24 rounded-full bg-white/30" />
      </div>
      <div className="mt-4 h-10 rounded-ctl bg-white/15" />
    </div>
  );
}
