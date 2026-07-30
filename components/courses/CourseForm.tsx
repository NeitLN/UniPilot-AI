"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCourse } from "@/app/(app)/schedule/actions";
import type { CourseFormState } from "@/app/(app)/schedule/actions";

const INITIAL_STATE: CourseFormState = { errors: {} };
const FIELD_ORDER = ["name", "semester", "credits"] as const;

export interface CourseFormProps {
  onSaved: (course: { id: string; name: string; code: string | null }) => void;
  onCancel: () => void;
  /** Compact layout for inline use (e.g. the "+ New course" shortcut inside
   * EventForm) — drops the heading and shrinks the action buttons. */
  compact?: boolean;
}

export function CourseForm({ onSaved, onCancel, compact }: CourseFormProps) {
  const [state, formAction, pending] = useActionState<CourseFormState, FormData>(
    createCourse,
    INITIAL_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok || !state.id) return;
    const name = formRef.current?.querySelector<HTMLInputElement>('[name="name"]')?.value ?? "";
    const code = formRef.current?.querySelector<HTMLInputElement>('[name="code"]')?.value ?? "";
    onSaved({ id: state.id, name, code: code || null });
  }, [state.ok, state.id, onSaved]);

  useEffect(() => {
    if (!state.errors) return;
    const firstField = FIELD_ORDER.find((name) => state.errors[name]);
    if (firstField) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
    }
  }, [state.errors]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3.5">
      {!compact && (
        <h2 className="font-display text-lg font-bold text-foreground">New course</h2>
      )}

      <Field label="Course name" error={state.errors.name}>
        <input
          name="name"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. Database Systems"
          className={inputClass(Boolean(state.errors.name))}
        />
      </Field>

      <div className="flex gap-3">
        <Field label="Code (optional)" className="flex-1">
          <input
            name="code"
            type="text"
            autoComplete="off"
            placeholder="e.g. CS301"
            className={inputClass(false)}
          />
        </Field>

        <Field label="Credits" error={state.errors.credits} className="w-24">
          <input
            name="credits"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            defaultValue={3}
            className={inputClass(Boolean(state.errors.credits))}
          />
        </Field>
      </div>

      <Field label="Semester" error={state.errors.semester}>
        <input
          name="semester"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. 253"
          className={inputClass(Boolean(state.errors.semester))}
        />
      </Field>

      {state.formError && (
        <p role="alert" className="text-xs font-semibold text-coral-text">
          {state.formError}
        </p>
      )}

      <div className="mt-1 flex gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white hover:bg-ink/90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add course"}
        </button>
      </div>
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
