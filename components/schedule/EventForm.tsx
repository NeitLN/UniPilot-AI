"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createEvent, updateEvent } from "@/app/(app)/schedule/actions";
import type { EventFormState } from "@/app/(app)/schedule/actions";
import { REPEAT_OPTIONS, REMINDER_OPTIONS, type EventRepeat } from "@/lib/rules/event";
import { CourseForm } from "@/components/courses/CourseForm";
import type { CourseOption } from "@/components/assignments/AssignmentForm";

const INITIAL_STATE: EventFormState = { errors: {} };
const FIELD_ORDER = ["title", "startAt", "endAt", "repeatUntil"] as const;
const NEW_COURSE = "__new__";

export interface EventFormValues {
  id: string;
  title: string;
  courseId: string;
  location: string;
  isAllDay: boolean;
  startAt: string; // datetime-local value
  endAt: string; // datetime-local value
  reminder: string; // see REMINDER_OPTIONS
  notes: string;
}

export interface EventFormProps {
  courses: CourseOption[];
  initialValues?: EventFormValues; // editing an existing occurrence — repeat fields are hidden
  onSaved: () => void;
  onCancel: () => void;
}

export function EventForm({ courses, initialValues, onSaved, onCancel }: EventFormProps) {
  const isEdit = Boolean(initialValues);
  const action = isEdit ? updateEvent.bind(null, initialValues!.id) : createEvent;

  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    action,
    INITIAL_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [isAllDay, setIsAllDay] = useState(initialValues?.isAllDay ?? false);
  const [startAt, setStartAt] = useState(initialValues?.startAt ?? defaultStart());
  const [endAt, setEndAt] = useState(initialValues?.endAt ?? defaultEnd(initialValues?.startAt));
  const [repeat, setRepeat] = useState<EventRepeat>("none");

  const [courseOptions, setCourseOptions] = useState(courses);
  const [courseId, setCourseId] = useState(initialValues?.courseId ?? "");
  const [addingCourse, setAddingCourse] = useState(false);

  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  useEffect(() => {
    if (!state.errors) return;
    const firstField = FIELD_ORDER.find((name) => state.errors[name]);
    if (firstField) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
    }
  }, [state.errors]);

  function handleAllDayToggle(checked: boolean) {
    setIsAllDay(checked);
    setStartAt(checked ? startAt.slice(0, 10) : `${startAt.slice(0, 10)}T09:00`);
    setEndAt(checked ? endAt.slice(0, 10) : `${endAt.slice(0, 10)}T10:00`);
  }

  function handleCourseCreated(course: { id: string; name: string; code: string | null }) {
    setCourseOptions((prev) => [...prev, course].sort((a, b) => a.name.localeCompare(b.name)));
    setCourseId(course.id);
    setAddingCourse(false);
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3.5">
      <h2 className="font-display text-lg font-bold text-foreground">
        {isEdit ? "Edit event" : "New event"}
      </h2>

      <Field label="Title" error={state.errors.title}>
        <input
          name="title"
          type="text"
          required
          autoComplete="off"
          placeholder="e.g. Study group…"
          defaultValue={initialValues?.title}
          className={inputClass(Boolean(state.errors.title))}
        />
      </Field>

      <label className="flex items-center justify-between rounded-ctl bg-line px-3.5 py-2.5">
        <span className="text-xs font-bold text-ink-2">All-day</span>
        <input
          name="isAllDay"
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => handleAllDayToggle(e.target.checked)}
          className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-pill bg-black/15 transition-colors before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-card before:transition-transform checked:bg-violet checked:before:translate-x-4"
        />
      </label>

      <div className="flex flex-col gap-3 min-[420px]:flex-row">
        <Field label="Starts" error={state.errors.startAt} className="min-w-0 flex-1">
          <input
            name="startAt"
            type={isAllDay ? "date" : "datetime-local"}
            required
            value={isAllDay ? startAt.slice(0, 10) : startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className={inputClass(Boolean(state.errors.startAt))}
          />
        </Field>

        <Field label="Ends" error={state.errors.endAt} className="min-w-0 flex-1">
          <input
            name="endAt"
            type={isAllDay ? "date" : "datetime-local"}
            required
            value={isAllDay ? endAt.slice(0, 10) : endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className={inputClass(Boolean(state.errors.endAt))}
          />
        </Field>
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-3 min-[420px]:flex-row">
          <Field label="Repeat" className="min-w-0 flex-1">
            <select
              name="repeat"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as EventRepeat)}
              className={inputClass(false)}
            >
              {REPEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          {repeat !== "none" && (
            <Field
              label="Repeat until"
              error={state.errors.repeatUntil}
              className="min-w-0 flex-1"
            >
              <input
                name="repeatUntil"
                type="date"
                required
                className={inputClass(Boolean(state.errors.repeatUntil))}
              />
            </Field>
          )}
        </div>
      )}
      {isEdit && (
        <p className="-mt-1.5 text-[11px] font-semibold text-ink-3">
          Editing this occurrence only.
        </p>
      )}

      {addingCourse ? (
        <div className="rounded-ctl border border-border-subtle p-3.5">
          <CourseForm
            compact
            onSaved={handleCourseCreated}
            onCancel={() => setAddingCourse(false)}
          />
        </div>
      ) : (
        <Field label="Course">
          <select
            name="courseId"
            value={courseId}
            onChange={(e) =>
              e.target.value === NEW_COURSE ? setAddingCourse(true) : setCourseId(e.target.value)
            }
            className={inputClass(false)}
          >
            <option value="">No course linked</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} — ${c.name}` : c.name}
              </option>
            ))}
            <option value={NEW_COURSE}>+ Add new course…</option>
          </select>
        </Field>
      )}

      <Field label="Location">
        <input
          name="location"
          type="text"
          autoComplete="off"
          placeholder="e.g. Library, room 204…"
          defaultValue={initialValues?.location}
          className={inputClass(false)}
        />
      </Field>

      <Field label="Alert">
        <select
          name="reminder"
          defaultValue={initialValues?.reminder ?? ""}
          className={inputClass(false)}
        >
          {REMINDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add event"}
        </button>
      </div>
    </form>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Next top-of-hour, as a datetime-local value — a sane default for a new event. */
function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One hour after `start` (or after the computed default when omitted). */
function defaultEnd(start?: string): string {
  const base = start ? new Date(start) : new Date(defaultStart());
  const d = new Date(base.getTime() + 60 * 60 * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inputClass(hasError: boolean) {
  return `w-full min-w-0 rounded-ctl border px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet ${
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
