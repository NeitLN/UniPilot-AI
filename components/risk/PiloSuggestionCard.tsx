import Link from "next/link";
import Image from "next/image";
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
export function PiloSuggestionCard({
  suggestion,
  target,
}: {
  suggestion: Suggestion;
  target: SuggestionTarget | null;
}) {
  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-start gap-3.5">
        <Image
          src="/mascots/pilo-workload-risk.png"
          alt=""
          width={100}
          height={107}
          className="h-[86px] w-auto shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-lg font-bold">Pilo&rsquo;s suggestion</h2>
          <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-white/88">
            {suggestion.message}
            {target && (
              <>
                {" "}
                Start with <span className="font-bold text-white">{target.title}</span>.
              </>
            )}
          </p>
        </div>
      </div>
      <Link
        href={target ? `/focus?assignment=${target.id}` : "/assignments"}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-ctl bg-lime px-3 py-3 text-center text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        {target ? `Start with ${target.title}` : "Review this week"}
      </Link>
    </div>
  );
}
