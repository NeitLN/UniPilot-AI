"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCourse } from "@/app/(app)/schedule/actions";
import type { CourseFormState } from "@/app/(app)/schedule/actions";
import { updateCourse } from "@/app/(app)/courses/actions";
import { FieldError } from "@/components/ui/FieldError";
import { Field, inputClass } from "@/components/ui/Field";

const INITIAL_STATE: CourseFormState = { errors: {} };
const FIELD_ORDER = ["name", "semester", "credits"] as const;

export interface CourseFormValues {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: string;
  /** True once at least one grade has been recorded for this course —
   * used only to show a note that credits here are informational and
   * don't retroactively touch grades already on the books (see the
   * grades.credit_hours field, entered separately per grade). */
  hasGrades: boolean;
}

export interface CourseFormProps {
  initialValues?: CourseFormValues;
  onSaved: (course: { id: string; name: string; code: string | null }) => void;
  onCancel: () => void;
  /** Compact layout for inline use (e.g. the "+ New course" shortcut inside
   * EventForm) — drops the heading and shrinks the action buttons. Only
   * meaningful for create, since edit is never opened from that shortcut. */
  compact?: boolean;
}

export function CourseForm({ initialValues, onSaved, onCancel, compact }: CourseFormProps) {
  const isEdit = Boolean(initialValues);
  const action = isEdit ? updateCourse.bind(null, initialValues!.id) : createCourse;

  const [state, formAction, pending] = useActionState<CourseFormState, FormData>(
    action,
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
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-3.5">
      {!compact && (
        <h2 className="font-display text-lg font-bold text-foreground">
          {isEdit ? "Edit course" : "New course"}
        </h2>
      )}

      <Field label="Course name" error={state.errors.name}>
        <input
          name="name"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. Database Systems"
          defaultValue={initialValues?.name}
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
            defaultValue={initialValues?.code}
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
            defaultValue={initialValues?.credits ?? 3}
            className={inputClass(Boolean(state.errors.credits))}
          />
        </Field>
      </div>

      {isEdit && initialValues!.hasGrades && (
        <p className="text-[11.5px] font-semibold text-ink-3">
          This course already has a recorded grade. Changing credits here won&rsquo;t
          affect it — grades keep their own credit hours from when they were added.
        </p>
      )}

      <Field label="Semester" error={state.errors.semester}>
        <input
          name="semester"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. 253"
          defaultValue={initialValues?.semester}
          className={inputClass(Boolean(state.errors.semester))}
        />
      </Field>

      {state.formError && <FieldError>{state.formError}</FieldError>}

      <div className="mt-1 flex gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white hover:bg-ink/90 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add course"}
        </button>
      </div>
    </form>
  );
}

