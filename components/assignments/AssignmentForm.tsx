"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createAssignment,
  updateAssignment,
  type AssignmentFormState,
} from "@/app/(app)/assignments/actions";
import { ensurePushSubscription } from "@/lib/push/subscribe";
import { enqueueMutation } from "@/lib/offline/idb";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

// Defined locally rather than imported from actions.ts: a "use server" module
// may only export async functions, so a plain object export from it resolves
// to `undefined` on the client — this was a real bug caught via manual testing.
const INITIAL_STATE: AssignmentFormState = { errors: {} };
import type { AssignmentPriority, AssignmentStatus } from "@/lib/supabase/types";

export interface CourseOption {
  id: string;
  name: string;
  code: string | null;
}

export interface AssignmentFormValues {
  id: string;
  title: string;
  courseId: string;
  dueAt: string; // datetime-local value, e.g. 2026-08-01T23:59
  weight: number;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  progress: number;
  notes: string;
  reminderAt: string;
  updatedAt: string;
  score: number | null;
}

export interface AssignmentFormProps {
  courses: CourseOption[];
  initialValues?: AssignmentFormValues;
  onSaved: () => void;
  onCancel: () => void;
}

const FIELD_ORDER = ["title", "courseId", "dueAt", "weight", "priority"] as const;

export function AssignmentForm({
  courses,
  initialValues,
  onSaved,
  onCancel,
}: AssignmentFormProps) {
  const isEdit = Boolean(initialValues);
  const action = isEdit
    ? updateAssignment.bind(null, initialValues!.id)
    : createAssignment;

  const [state, formAction, pending] = useActionState<
    AssignmentFormState,
    FormData
  >(action, INITIAL_STATE);

  const [progress, setProgress] = useState(initialValues?.progress ?? 0);
  const formRef = useRef<HTMLFormElement>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!state.ok) return;
    // Ask for notification permission right here — the moment the user has
    // just saved an assignment with a reminder — not on first app load.
    const reminderInput =
      formRef.current?.querySelector<HTMLInputElement>('[name="reminderAt"]');
    if (reminderInput?.value) {
      void ensurePushSubscription();
    }
    onSaved();
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (isOnline) return; // let the normal server-action form submission run

    e.preventDefault();
    const payload: Record<string, string> = {};
    for (const [key, value] of new FormData(e.currentTarget).entries()) {
      if (typeof value === "string") payload[key] = value;
    }

    if (isEdit) {
      await enqueueMutation("updateAssignment", {
        id: initialValues!.id,
        snapshotUpdatedAt: initialValues!.updatedAt,
        ...payload,
      });
    } else {
      await enqueueMutation("createAssignment", payload);
    }

    onSaved();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3.5"
    >
      <h2 className="font-display text-lg font-bold text-ink">
        {isEdit ? "Edit assignment" : "New assignment"}
      </h2>

      <Field label="Title" error={state.errors.title}>
        <input
          name="title"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. Database design report…"
          defaultValue={initialValues?.title}
          className={inputClass(Boolean(state.errors.title))}
        />
      </Field>

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
        <Field label="Due date" error={state.errors.dueAt} className="flex-1">
          <input
            name="dueAt"
            type="datetime-local"
            required
            defaultValue={initialValues?.dueAt}
            className={inputClass(Boolean(state.errors.dueAt))}
          />
        </Field>

        <Field label="Weight %" error={state.errors.weight} className="w-28">
          <input
            name="weight"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            required
            defaultValue={initialValues?.weight}
            className={inputClass(Boolean(state.errors.weight))}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <Field label="Priority" error={state.errors.priority} className="flex-1">
          <select
            name="priority"
            required
            defaultValue={initialValues?.priority ?? ""}
            className={inputClass(Boolean(state.errors.priority))}
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>

        <Field label="Status" className="flex-1">
          <select
            name="status"
            defaultValue={initialValues?.status ?? "not_started"}
            className={inputClass(false)}
          >
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </Field>
      </div>

      <Field label={`Progress — ${progress}%`} error={state.errors.progress}>
        <input
          name="progress"
          type="range"
          min={0}
          max={100}
          step={1}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-violet"
        />
      </Field>

      <Field label="Score % — optional, once graded" error={state.errors.score}>
        <input
          name="score"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.5}
          placeholder="e.g. 92"
          defaultValue={initialValues?.score ?? undefined}
          className={inputClass(Boolean(state.errors.score))}
        />
      </Field>

      <Field label="Reminder time">
        <input
          name="reminderAt"
          type="datetime-local"
          defaultValue={initialValues?.reminderAt}
          className={inputClass(false)}
        />
      </Field>

      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          autoComplete="off"
          placeholder="Optional context for later…"
          defaultValue={initialValues?.notes}
          className={inputClass(false)}
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
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add assignment"}
        </button>
      </div>
    </form>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-ctl border px-3.5 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet ${
    hasError ? "border-coral" : "border-black/10 focus:border-violet"
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
