"use client";

import { useActionState, useState } from "react";
import {
  updateStudyPreferences,
  type StudyPreferencesFormState,
} from "@/app/(app)/settings/actions";
import { FieldError } from "@/components/ui/FieldError";
import { FieldSuccess } from "@/components/ui/FieldSuccess";
import { Field, inputClass } from "@/components/ui/Field";
import { FOCUS_DURATION_OPTIONS, WEEKDAY_LABELS } from "@/lib/rules/preferences";

const INITIAL_STATE: StudyPreferencesFormState = { errors: {} };

export interface StudyPreferencesFormValues {
  weeklyAvailabilityHours: number;
  targetGpa: number | null;
  defaultFocusMinutes: number;
  dailyFocusGoalCycles: number;
  preferredStudyDays: number[];
  programTotalCredits: number | null;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export function StudyPreferencesForm({
  initialValues,
}: {
  initialValues: StudyPreferencesFormValues;
}) {
  const [state, formAction, pending] = useActionState<StudyPreferencesFormState, FormData>(
    updateStudyPreferences,
    INITIAL_STATE,
  );
  const [focusMinutes, setFocusMinutes] = useState(initialValues.defaultFocusMinutes);
  const [days, setDays] = useState(new Set(initialValues.preferredStudyDays));
  const [availabilityHours, setAvailabilityHours] = useState(initialValues.weeklyAvailabilityHours);

  function toggleDay(day: number) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Field
        label="Weekly availability"
        error={state.errors.weeklyAvailabilityHours}
      >
        <p className="font-display text-3xl font-bold text-violet tabular-nums">
          {availabilityHours || 0} <span className="text-base font-semibold text-ink-3">hours</span>
        </p>
        <input
          name="weeklyAvailabilityHours"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          required
          value={availabilityHours}
          onChange={(e) => setAvailabilityHours(Number(e.target.value))}
          className={`mt-2 ${inputClass(Boolean(state.errors.weeklyAvailabilityHours))}`}
        />
        <span className="mt-1 text-[11px] font-semibold text-ink-3">
          How many hours a week you can realistically study — this gates the AI
          Planner and Workload Risk score.
        </span>
      </Field>

      <Field label="Target GPA" error={state.errors.targetGpa}>
        <input
          name="targetGpa"
          type="number"
          inputMode="decimal"
          min={0}
          max={4}
          step={0.1}
          defaultValue={initialValues.targetGpa ?? undefined}
          className={inputClass(Boolean(state.errors.targetGpa))}
        />
      </Field>

      <Field label="Total credits to graduate" error={state.errors.programTotalCredits}>
        <input
          name="programTotalCredits"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder="e.g. 140"
          defaultValue={initialValues.programTotalCredits ?? undefined}
          className={inputClass(Boolean(state.errors.programTotalCredits))}
        />
        <span className="mt-1 text-[11px] font-semibold text-ink-3">
          Powers the GPA tracker&rsquo;s &ldquo;On track&rdquo; card — leave blank to hide it.
        </span>
      </Field>

      <div className="flex flex-col gap-1.5 text-xs font-bold text-ink-2">
        Default focus duration
        <div className="flex gap-1.5 rounded-ctl bg-line p-1">
          {FOCUS_DURATION_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setFocusMinutes(minutes)}
              aria-pressed={focusMinutes === minutes}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-[calc(var(--radius-ctl)-4px)] text-xs font-bold transition-colors ${
                focusMinutes === minutes
                  ? "bg-card text-foreground shadow-sm"
                  : "text-ink-2 hover:text-foreground"
              }`}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <input type="hidden" name="defaultFocusMinutes" value={focusMinutes} />
        {state.errors.defaultFocusMinutes && (
          <FieldError as="span" className="text-[11px]">
            {state.errors.defaultFocusMinutes}
          </FieldError>
        )}
      </div>

      <Field
        label="Daily focus goal (cycles)"
        error={state.errors.dailyFocusGoalCycles}
      >
        <input
          name="dailyFocusGoalCycles"
          type="number"
          inputMode="numeric"
          min={1}
          max={12}
          step={1}
          required
          defaultValue={initialValues.dailyFocusGoalCycles}
          className={inputClass(Boolean(state.errors.dailyFocusGoalCycles))}
        />
      </Field>

      <div className="flex flex-col gap-1.5 text-xs font-bold text-ink-2">
        Preferred study days
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              aria-pressed={days.has(day)}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-ctl px-3 text-xs font-bold transition-colors ${
                days.has(day)
                  ? "bg-violet text-white"
                  : "bg-line text-ink-2 hover:bg-line-hover"
              }`}
            >
              {WEEKDAY_LABELS[day]}
            </button>
          ))}
        </div>
        {[...days].map((day) => (
          <input key={day} type="hidden" name="preferredStudyDays" value={day} />
        ))}
        {state.errors.preferredStudyDays && (
          <FieldError as="span" className="text-[11px]">
            {state.errors.preferredStudyDays}
          </FieldError>
        )}
      </div>

      {state.formError && <FieldError>{state.formError}</FieldError>}
      {state.ok && <FieldSuccess>Saved.</FieldSuccess>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex min-h-11 w-fit items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
