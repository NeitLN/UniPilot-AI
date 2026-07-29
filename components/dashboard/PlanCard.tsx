import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Pilo } from "@/components/brand/Pilo";

/** BR-02: the Draft badge always shows for a real draft — never silently active. */
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

  const status = draftPlan ? "draft" : activePlan ? "active" : "none";

  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
          <Pilo mood="happy" size={34} />
        </span>
        <h2 className="font-display text-lg font-bold">Pilo&rsquo;s plan</h2>
        <span className="ml-auto shrink-0 rounded-pill bg-white/22 px-2.5 py-1 text-[10.5px] font-extrabold">
          {status === "draft" ? "Draft" : status === "active" ? "Active" : "No plan"}
        </span>
      </div>
      <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-[#C9B9FF]">
        {status === "draft"
          ? "A draft is waiting for your review — nothing is scheduled until you confirm it."
          : status === "active"
            ? "Your weekly study sessions are confirmed and active."
            : "Generate a weekly study plan whenever you're ready."}
      </p>
      <Link
        href="/planner"
        className="mt-4 block w-full rounded-ctl bg-lime py-3 text-center text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        {status === "draft"
          ? "Review draft"
          : status === "active"
            ? "View plan"
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
