"use client";

import { useState, useTransition } from "react";
import { requiredAverage } from "@/lib/rules/gpa";
import { updateTargetGpa } from "@/app/(app)/gpa/actions";

export interface ForecastCardProps {
  initialTargetGpa: number;
  doneCredits: number;
  currentQP: number;
}

export function ForecastCard({
  initialTargetGpa,
  doneCredits,
  currentQP,
}: ForecastCardProps) {
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
        setSaveError(
          err instanceof Error ? err.message : "Couldn't save target GPA.",
        );
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
    <div className="rounded-card bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">Forecast</h2>

      <div className="mt-3 flex gap-3">
        <label className="flex-1 text-xs font-bold text-ink-2">
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
            className="mt-1 w-full rounded-ctl border border-black/10 px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60"
          />
        </label>
        <label className="flex-1 text-xs font-bold text-ink-2">
          Remaining credits
          <input
            type="number"
            min={1}
            step={1}
            value={remainingCredits}
            onChange={(e) => setRemainingCredits(Number(e.target.value))}
            className="mt-1 w-full rounded-ctl border border-black/10 px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet"
          />
        </label>
      </div>

      {saveError && (
        <p role="alert" className="mt-2 text-[11.5px] font-semibold text-coral-text">
          {saveError}
        </p>
      )}

      {!hasGrades && (
        <div className="mt-4 rounded-ctl bg-line p-4">
          <p className="text-[12.5px] font-semibold text-ink-2">
            Add a grade first — the forecast needs at least one completed
            course to weigh your target against.
          </p>
        </div>
      )}

      {result && (
        <div
          className={`mt-4 rounded-ctl p-4 ${result.achievable ? "bg-mint-tint" : "bg-coral-tint"}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
            Required average
          </p>
          <p
            className={`mt-1 font-display text-2xl font-bold tabular-nums ${
              result.achievable ? "text-mint-text" : "text-coral-text"
            }`}
          >
            {result.value.toFixed(2)}
          </p>
          <p
            className={`mt-1 text-[12.5px] font-semibold ${
              result.achievable ? "text-mint-text" : "text-coral-text"
            }`}
          >
            {result.achievable
              ? "Achievable with your remaining credits."
              : "Not achievable with these assumptions — required average is over 4.0."}
          </p>
        </div>
      )}
    </div>
  );
}
