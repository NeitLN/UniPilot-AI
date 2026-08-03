import Link from "next/link";
import { Pilo } from "@/components/brand/Pilo";
import type { Suggestion } from "@/lib/rules/risk";

export interface SuggestionTarget {
  id: string;
  title: string;
}

/** `target` is picked by the same deterministic, unit-tested
 * `pickPiloAssignment` tiering Assignments' own Pilo card uses (brief §6.5)
 * — overdue+high priority, then overdue, then high-priority upcoming, then
 * soonest deadline. `null` means there's genuinely no actionable assignment
 * right now, so the CTA falls back to a real (not preselected) destination. */
export function PiloSuggestionCard({ suggestion, target }: { suggestion: Suggestion; target: SuggestionTarget | null }) {
  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card">
          <Pilo mood="ready" size={34} />
        </span>
        <h2 className="font-display text-lg font-bold">Pilo&rsquo;s suggestion</h2>
      </div>
      <p className="mt-3 text-[13px] font-medium leading-relaxed text-white/88">
        {suggestion.message}
        {target && (
          <>
            {" "}
            Start with <span className="font-bold text-white">{target.title}</span>.
          </>
        )}
      </p>
      <Link
        href={target ? `/focus?assignment=${target.id}` : "/assignments"}
        className="mt-4 block w-full rounded-ctl bg-lime py-3 text-center text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        {target ? `Start with ${target.title}` : "Review this week"}
      </Link>
    </div>
  );
}
