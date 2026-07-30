"use client";

import { useActionState } from "react";
import { updateProfile, type SettingsFormState } from "@/app/(app)/settings/actions";

const INITIAL_STATE: SettingsFormState = { errors: {} };

export interface SettingsFormValues {
  fullName: string;
  weeklyAvailabilityHours: number;
  targetGpa: number | null;
}

export function SettingsForm({ initialValues }: { initialValues: SettingsFormValues }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateProfile,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Field label="Full name">
        <input
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="e.g. Vo Viet Tien"
          defaultValue={initialValues.fullName}
          className={inputClass(false)}
        />
      </Field>

      <Field
        label="Weekly availability (hours)"
        error={state.errors.weeklyAvailabilityHours}
      >
        <input
          name="weeklyAvailabilityHours"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          required
          defaultValue={initialValues.weeklyAvailabilityHours}
          className={inputClass(Boolean(state.errors.weeklyAvailabilityHours))}
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

      {state.formError && (
        <p role="alert" className="text-xs font-semibold text-coral-text">
          {state.formError}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-xs font-semibold text-mint-text">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex min-h-11 items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-ctl border px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet ${
    hasError ? "border-coral" : "border-border-subtle focus:border-violet"
  }`;
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-bold text-ink-2 ${className ?? ""}`}>
      {label}
      {children}
      {error && (
        <span role="alert" className="text-[11px] font-semibold text-coral-text">
          {error}
        </span>
      )}
    </label>
  );
}
