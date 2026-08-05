import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOverdue, pickPiloAssignment, relativeDueLabel } from "@/lib/rules/assignment";

/**
 * Dashboard's "what should I do right now" card. Uses the same deterministic,
 * unit-tested `pickPiloAssignment` tiering that Assignments' Pilo's-pick and
 * Workload Risk's suggestion already use — one rule, three surfaces, so they
 * can never recommend three different tasks on the same day.
 */
export async function PiloBriefingCard() {
  const supabase = await createClient();
  const now = new Date();

  const { data } = await supabase
    .from("assignments")
    .select("id, title, due_at, priority, status, archived_at")
    .is("archived_at", null)
    .neq("status", "done");

  const pick = pickPiloAssignment(
    (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      dueAt: a.due_at,
      priority: a.priority,
      status: a.status,
      archivedAt: a.archived_at,
    })),
    now,
  );

  // Badge states the real reason this task was picked, rather than a fixed
  // "Priority" label that would be wrong for a merely-soonest deadline.
  const badge = !pick
    ? null
    : isOverdue(pick, now)
      ? "Overdue"
      : pick.priority === "high"
        ? "Priority"
        : "Next up";

  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-start gap-3.5">
        <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[20px] bg-card">
          <Image
            src="/mascots/pilo-assignments.png"
            alt=""
            width={96}
            height={96}
            className="h-[60px] w-[60px] object-contain"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">Pilo&rsquo;s daily briefing</h2>
            {badge && (
              <span className="ml-auto shrink-0 rounded-pill bg-lime px-2.5 py-1 text-[10.5px] font-extrabold text-ink">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-white/88">
            {pick ? (
              <>
                Start with <span className="font-bold text-white">{pick.title}</span> — it&rsquo;s
                due {relativeDueLabel(pick.dueAt, now)}.
              </>
            ) : (
              "All clear — nothing outstanding right now. Add your next assignment when you're ready."
            )}
          </p>
        </div>
      </div>

      <Link
        href={pick ? `/focus?assignment=${pick.id}` : "/assignments"}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-ctl bg-lime py-3 text-center text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        {pick ? "Open task" : "Go to assignments"}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function PiloBriefingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-violet p-5">
      <div className="flex items-start gap-3.5">
        <div className="h-[76px] w-[76px] shrink-0 rounded-[20px] bg-white/30" />
        <div className="flex-1">
          <div className="h-4 w-40 rounded-full bg-white/30" />
          <div className="mt-3 h-3 w-full rounded-full bg-white/20" />
        </div>
      </div>
      <div className="mt-4 h-11 rounded-ctl bg-white/15" />
    </div>
  );
}
