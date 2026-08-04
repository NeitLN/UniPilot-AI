import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { OnTrackResult } from "@/lib/rules/gpa";

const STATUS_COPY: Record<OnTrackResult["status"], (req: number | null, target: number) => string> = {
  "on-track": (req) => `You need a ${req!.toFixed(2)} average across your remaining credits.`,
  "at-risk": (req) => `You need a ${req!.toFixed(2)} average across your remaining credits — that's tight.`,
  impossible: (req) =>
    req === null
      ? "Your target isn't reachable anymore — every credit is already in."
      : `A ${req.toFixed(2)} average is needed, which is over 4.0 — this target isn't reachable with these credits.`,
  reached: (_req, target) => `You've already reached your ${target.toFixed(2)} target GPA.`,
};

const STATUS_ICON: Record<OnTrackResult["status"], typeof CheckCircle2> = {
  "on-track": CheckCircle2,
  "at-risk": AlertTriangle,
  impossible: XCircle,
  reached: CheckCircle2,
};

/** Concept §5.1's "On track" card — real once Settings has a saved
 * `programTotalCredits` (see lib/rules/gpa.ts onTrackProgress's doc
 * comment for why this was dropped from the original pixel-match pass). */
export function OnTrackCard({ result, targetGpa }: { result: OnTrackResult; targetGpa: number }) {
  const Icon = STATUS_ICON[result.status];
  return (
    <div className="flex flex-1 flex-col justify-between gap-3 rounded-card bg-mint-tint p-5">
      <div className="flex items-start gap-2.5">
        <Icon
          className={`h-5 w-5 shrink-0 ${result.status === "impossible" ? "text-coral-text" : result.status === "at-risk" ? "text-tangerine-text" : "text-mint-text"}`}
          aria-hidden="true"
        />
        <div>
          <p className="font-display text-sm font-bold text-mint-text">
            {result.status === "impossible" ? "Off track" : result.status === "at-risk" ? "At risk" : "On track"}
          </p>
          <p className="mt-0.5 text-[12.5px] font-semibold text-mint-text/90">
            {STATUS_COPY[result.status](result.requiredAverage, targetGpa)}
          </p>
        </div>
      </div>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-mint-text/15">
          <div className="h-full rounded-full bg-mint-text" style={{ width: `${result.completedPct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] font-bold text-mint-text/80">
          {result.completedPct}% of credits completed · {result.remainingCredits} credits remaining
        </p>
      </div>
    </div>
  );
}
