import { Check, AlertTriangle, X, Target } from "lucide-react";
import type { OnTrackResult } from "@/lib/rules/gpa";

const STATUS_COPY: Record<OnTrackResult["status"], (req: number | null, target: number) => string> =
  {
    "on-track": (req) => `You need a ${req!.toFixed(2)} average across your remaining credits.`,
    "at-risk": (req) =>
      `You need a ${req!.toFixed(2)} average across your remaining credits — that's tight.`,
    impossible: (req) =>
      req === null
        ? "Your target isn't reachable anymore — every credit is already in."
        : `A ${req.toFixed(2)} average is needed, which is over 4.0 — this target isn't reachable with these credits.`,
    reached: (_req, target) => `You've already reached your ${target.toFixed(2)} target GPA.`,
    // States the requirement without passing judgment on it — there are no
    // completed credits yet to judge.
    "not-started": (req, target) =>
      `Hitting your ${target.toFixed(2)} target means averaging ${req!.toFixed(2)} across your credits. Add your first grade to see how you're tracking.`,
  };

const STATUS_ICON: Record<OnTrackResult["status"], typeof Check> = {
  "on-track": Check,
  "at-risk": AlertTriangle,
  impossible: X,
  reached: Check,
  "not-started": Target,
};

const STATUS_TITLE: Record<OnTrackResult["status"], string> = {
  "on-track": "On track",
  "at-risk": "At risk",
  impossible: "Off track",
  reached: "Target reached",
  "not-started": "Your target",
};

/** Each status keeps its own card tint plus a matching dark disc, so the
 * headline colour and the badge never disagree about how things are going.
 * Every class is a whole literal — Tailwind resolves these at build time, so
 * a composed `${skin.text}/90` would be invisible to the scanner and purged. */
interface StatusSkin {
  card: string;
  disc: string;
  text: string;
  textSoft: string;
  track: string;
  fill: string;
}

const MINT_SKIN: StatusSkin = {
  card: "bg-mint-tint",
  disc: "bg-ink",
  text: "text-mint-text",
  textSoft: "text-mint-text/90",
  track: "bg-mint-text/20",
  fill: "bg-ink",
};

const STATUS_SKIN: Record<OnTrackResult["status"], StatusSkin> = {
  "on-track": MINT_SKIN,
  reached: MINT_SKIN,
  // Violet, not amber: this is the brand's neutral "informational" tint.
  // Nothing has gone wrong yet, so nothing here should read as a warning.
  "not-started": {
    card: "bg-violet-tint",
    disc: "bg-violet-text",
    text: "text-violet-text",
    textSoft: "text-violet-text/90",
    track: "bg-violet-text/20",
    fill: "bg-violet-text",
  },
  "at-risk": {
    card: "bg-tangerine-tint",
    disc: "bg-tangerine-text",
    text: "text-tangerine-text",
    textSoft: "text-tangerine-text/90",
    track: "bg-tangerine-text/20",
    fill: "bg-tangerine-text",
  },
  impossible: {
    card: "bg-coral-tint",
    disc: "bg-coral-text",
    text: "text-coral-text",
    textSoft: "text-coral-text/90",
    track: "bg-coral-text/20",
    fill: "bg-coral-text",
  },
};

/** Concept §5.1's "On track" card — real once Settings has a saved
 * `programTotalCredits` (see lib/rules/gpa.ts onTrackProgress's doc
 * comment for why this was dropped from the original pixel-match pass). */
export function OnTrackCard({ result, targetGpa }: { result: OnTrackResult; targetGpa: number }) {
  const Icon = STATUS_ICON[result.status];
  const skin = STATUS_SKIN[result.status];

  return (
    <div className={`flex flex-1 flex-col justify-between gap-4 rounded-card p-6 ${skin.card}`}>
      <div className="flex items-start gap-4">
        {/* A filled disc, not a bare 20px glyph — at this card's size the
            status is the headline, and the concept gives it that weight. */}
        <span
          aria-hidden="true"
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${skin.disc}`}
        >
          <Icon className="h-7 w-7 text-white" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className={`font-display text-2xl font-bold ${skin.text}`}>
            {STATUS_TITLE[result.status]}
          </p>
          <p className={`mt-1 text-[13px] font-semibold ${skin.textSoft}`}>
            {STATUS_COPY[result.status](result.requiredAverage, targetGpa)}
          </p>
        </div>
      </div>

      <div>
        <div className={`h-2.5 w-full overflow-hidden rounded-full ${skin.track}`}>
          <div
            className={`h-full rounded-full ${skin.fill}`}
            style={{ width: `${result.completedPct}%` }}
          />
        </div>
        {/* Split to the two ends rather than joined by a "·": they are two
            independent readings of the same bar, one per end it describes. */}
        <div
          className={`mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11.5px] font-bold ${skin.textSoft}`}
        >
          <span>{result.completedPct}% of credits completed</span>
          <span>{result.remainingCredits} credits remaining</span>
        </div>
      </div>
    </div>
  );
}
