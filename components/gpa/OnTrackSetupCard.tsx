import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";

/**
 * PROD-04 — "On track" needs both a target GPA and a total-credits figure,
 * and onboarding deliberately asks for neither (it collects weekly
 * availability, a course and a first task, and says so in its own comment).
 *
 * When either is missing the card used to simply not render. The student
 * saw no card, no gap and no explanation — so a real feature was invisible,
 * and there was nothing anywhere telling them how to switch it on. A silent
 * absence is the worst version of this: it cannot be acted on, and it cannot
 * even be reported as a problem.
 *
 * This takes the same slot and names exactly what is missing.
 */
export function OnTrackSetupCard({
  hasTargetGpa,
  hasProgramCredits,
}: {
  hasTargetGpa: boolean;
  hasProgramCredits: boolean;
}) {
  const missing = [
    !hasTargetGpa ? "a target GPA" : null,
    !hasProgramCredits ? "the total credits your degree needs" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-1 flex-col justify-between gap-4 rounded-card border border-dashed border-border-cb bg-card p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-tint text-violet-text"
        >
          <Target className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold text-foreground">Are you on track?</p>
          <p className="mt-1 text-[13px] font-semibold text-ink-2">
            UniPilot can work out the average you need across your remaining credits — it just
            needs {missing.join(" and ")}.
          </p>
        </div>
      </div>

      <Link
        href="/settings#study-preferences"
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-ctl bg-violet px-4 text-sm font-bold text-white hover:bg-violet-deep"
      >
        Add {missing.length > 1 ? "them" : "it"} in Settings
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
