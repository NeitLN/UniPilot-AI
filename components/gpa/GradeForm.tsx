"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createGrade,
  updateGrade,
  type GradeFormState,
} from "@/app/(app)/gpa/actions";
import type { CourseOption } from "@/components/assignments/AssignmentForm";
import { FieldError } from "@/components/ui/FieldError";

const INITIAL_STATE: GradeFormState = { errors: {} };
const FIELD_ORDER = ["courseId", "semester", "gradePoint", "creditHours"] as const;

export interface GradeFormValues {
  id: string;
  courseId: string;
  semester: string;
  gradePoint: number;
  creditHours: number;
}

export interface GradeFormProps {
  courses: CourseOption[];
  initialValues?: GradeFormValues;
  onSaved: () => void;
  onCancel: () => void;
}

export function GradeForm({
  courses,
  initialValues,
  onSaved,
  onCancel,
}: GradeFormProps) {
  const isEdit = Boolean(initialValues);
  const action = isEdit ? updateGrade.bind(null, initialValues!.id) : createGrade;

  const [state, formAction, pending] = useActionState<GradeFormState, FormData>(
    action,
    INITIAL_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  useEffect(() => {
    if (!state.errors) return;
    const firstField = FIELD_ORDER.find((name) => state.errors[name]);
    if (firstField) {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstField}"]`)
        ?.focus();
    }
  }, [state.errors]);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-3.5">
      <h2 className="font-display text-lg font-bold text-foreground">
        {isEdit ? "Edit grade" : "Add grade"}
      </h2>

      <Field label="Course" error={state.errors.courseId}>
        <select
          name="courseId"
          required
          defaultValue={initialValues?.courseId ?? ""}
          className={inputClass(Boolean(state.errors.courseId))}
        >
          <option value="" disabled>
            Select a course…
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.code} — ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3">
        <Field label="Semester" error={state.errors.semester} className="flex-1">
          <input
            name="semester"
            type="text"
            required
            placeholder="e.g. 253…"
            defaultValue={initialValues?.semester}
            className={inputClass(Boolean(state.errors.semester))}
          />
        </Field>

        <Field
          label="Grade point"
          error={state.errors.gradePoint}
          className="w-32"
        >
          <input
            name="gradePoint"
            type="number"
            inputMode="decimal"
            min={0}
            max={4}
            step={0.1}
            required
            defaultValue={initialValues?.gradePoint}
            className={inputClass(Boolean(state.errors.gradePoint))}
          />
        </Field>
      </div>

      <Field
        label="Credit hours"
        error={state.errors.creditHours}
        className="w-32"
      >
        <input
          name="creditHours"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          defaultValue={initialValues?.creditHours}
          className={inputClass(Boolean(state.errors.creditHours))}
        />
      </Field>

      {state.formError && <FieldError>{state.formError}</FieldError>}

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
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add grade"}
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
        <FieldError as="span" className="text-[11px]">
          {error}
        </FieldError>
      )}
    </label>
  );
}
