import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { streakDays } from "@/lib/rules/focus";

export async function FocusCard() {
  const supabase = await createClient();
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data } = await supabase
    .from("focus_sessions")
    .select("started_at, result")
    .gte("started_at", sixtyDaysAgo.toISOString());

  const streak = streakDays(
    (data ?? []).map((s) => ({ startedAt: s.started_at, result: s.result })),
  );

  return (
    <div className="rounded-card bg-lime p-5 text-center">
      <div className="mx-auto flex h-[150px] w-[150px] items-center justify-center rounded-full bg-ink/10">
        <p className="font-display text-4xl font-bold text-ink">
          {streak > 0 ? `${streak}d` : "25:00"}
        </p>
      </div>
      <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink/60">
        {streak > 0 ? "Current streak" : "Focus timer"}
      </p>
      <Link
        href="/focus"
        className="mt-4 block w-full rounded-ctl bg-ink py-3 text-sm font-extrabold text-white hover:bg-ink/90"
      >
        Start a session
      </Link>
    </div>
  );
}

export function FocusCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-lime p-5">
      <div className="mx-auto h-[150px] w-[150px] rounded-full bg-ink/10" />
      <div className="mx-auto mt-4 h-9 w-full rounded-ctl bg-ink/10" />
    </div>
  );
}
