"use client";

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { requiredAverage } from "@/lib/rules/gpa";
import { updateTargetGpa } from "@/app/(app)/gpa/actions";
import { FieldError } from "@/components/ui/FieldError";

export interface ForecastCardProps {
  initialTargetGpa: number;
  doneCredits: number;
  currentQP: number;
}

const inputClass =
  "mt-1 w-full rounded-ctl border border-ink/15 bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60";

export function ForecastCard({ initialTargetGpa, doneCredits, currentQP }: ForecastCardProps) {
  const [target, setTarget] = useState(initialTargetGpa);
  const [remainingCredits, setRemainingCredits] = useState(15);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleTargetBlur() {
    if (target === initialTargetGpa || Number.isNaN(target)) return;
    startTransition(async () => {
      try {
        await updateTargetGpa(target);
        setSaveError(null);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Couldn't save target GPA.");
      }
    });
  }

  // A-03: with 0 completed credits, requiredAverage() collapses to just
  // `target` itself (nothing to weigh it against yet) — mathematically
  // correct, but "3.60 — Achievable" reads as a real forecast when there's
  // no grade data behind it at all. Show a neutral prompt instead.
  const hasGrades = doneCredits > 0;
  const result =
    hasGrades && remainingCredits > 0 && !Number.isNaN(target)
      ? requiredAverage(target, doneCredits, remainingCredits, currentQP)
      : null;

  return (
    <div className="rounded-card bg-lime p-5">
      <h2 className="font-display text-lg font-bold text-ink">What if? GPA simulator</h2>

      {/* Stacks until xl. This card lives in the page's narrow right column,
          where three side-by-side blocks squeezed the number inputs down to
          about 60px and clipped "3.60" to "3". */}
      <div className="mt-3 flex flex-col items-stretch gap-3 xl:flex-row xl:items-center">
        <div className="flex flex-1 gap-3 rounded-ctl bg-card p-3">
          <label className="flex-1 text-[11.5px] font-bold text-ink-2">
            Target GPA
            <input
              type="number"
              min={0}
              max={4}
              step={0.1}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              onBlur={handleTargetBlur}
              disabled={pending}
              className={inputClass}
            />
          </label>
          <label className="flex-1 text-[11.5px] font-bold text-ink-2">
            Remaining credits
            <input
              type="number"
              min={1}
              step={1}
              value={remainingCredits}
              onChange={(e) => setRemainingCredits(Number(e.target.value))}
              className={inputClass}
            />
          </label>
        </div>

        {/* A connector, not a control: the figure on the right recomputes as
            you type, so a "calculate" button would have nothing to do. Marked
            decorative so assistive tech doesn't announce a phantom action. */}
        <span
          aria-hidden="true"
          className="mx-auto flex h-9 w-9 shrink-0 rotate-90 items-center justify-center rounded-full bg-ink text-white xl:rotate-0"
        >
          <ChevronRight className="h-4 w-4" />
        </span>

        {result && (
          <div
            className={`flex-1 rounded-ctl p-3 text-center ${result.achievable ? "bg-mint-tint" : "bg-coral-tint"}`}
          >
            {/* D-03 (docs/UIUX_REVIEW.md): text-ink-3 measured 2.66:1 here in
                dark mode — it flips light for dark backgrounds, but these
                tints stay light in both themes. Matching the label to the
                badge's own already-safe tone fixes it without a third rule. */}
            <p
              className={`text-[11px] font-semibold ${result.achievable ? "text-mint-text" : "text-coral-text"}`}
            >
              Required average
            </p>
            <p
              className={`mt-0.5 font-display text-[30px] font-bold leading-none tabular-nums ${
                result.achievable ? "text-mint-text" : "text-coral-text"
              }`}
            >
              {result.value.toFixed(2)}
            </p>
            <p
              className={`mt-1 text-[10.5px] font-semibold ${
                result.achievable ? "text-mint-text" : "text-coral-text"
              }`}
            >
              {result.achievable
                ? "across remaining credits"
                : "over 4.0 — not achievable with these assumptions"}
            </p>
          </div>
        )}

        {!hasGrades && (
          <div className="flex-1 rounded-ctl bg-card p-3">
            <p className="text-[12px] font-semibold text-ink-2">
              Add a grade first — the forecast needs at least one completed course to weigh your
              target against.
            </p>
          </div>
        )}
      </div>

      {saveError && <FieldError className="mt-2 text-[11.5px]">{saveError}</FieldError>}
    </div>
  );
}
