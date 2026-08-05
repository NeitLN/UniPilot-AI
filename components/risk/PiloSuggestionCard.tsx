import Link from "next/link";
import Image from "next/image";
import type { Suggestion, SuggestionAction } from "@/lib/rules/risk";

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
  action,
}: {
  suggestion: Suggestion;
  target: SuggestionTarget | null;
  /** Where the CTA goes, chosen by `suggestionAction` from the same factor
   * that produced `suggestion` — passed in rather than derived here so the
   * pairing is unit-tested instead of living in JSX. */
  action: SuggestionAction;
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
      {/* The destination follows the advice rather than always being the
          timer. "Cut scope on one item" over a button that starts a Pomodoro
          is advice the student cannot act on, which is barely better than
          showing them the bare score. */}
      <Link
        href={action.href}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-ctl bg-lime px-3 py-3 text-center text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        {action.label}
      </Link>
    </div>
  );
}
