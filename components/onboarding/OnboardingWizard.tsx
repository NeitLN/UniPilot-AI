"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, type SettingsFormState } from "@/app/(app)/settings/actions";
import { createCourse, type CourseFormState } from "@/app/(app)/schedule/actions";
import {
  createAssignment,
  type AssignmentFormState,
} from "@/app/(app)/assignments/actions";
import { Pilo } from "@/components/brand/Pilo";
import { FieldError } from "@/components/ui/FieldError";

const SETTINGS_INITIAL: SettingsFormState = { errors: {} };
const COURSE_INITIAL: CourseFormState = { errors: {} };
const ASSIGNMENT_INITIAL: AssignmentFormState = { errors: {} };

const STEPS = ["Availability", "Course", "First task"] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [courseName, setCourseName] = useState("");

  const [settingsState, settingsAction, settingsPending] = useActionState<
    SettingsFormState,
    FormData
  >(updateProfile, SETTINGS_INITIAL);
  const [courseState, courseAction, coursePending] = useActionState<
    CourseFormState,
    FormData
  >(createCourse, COURSE_INITIAL);
  const [assignmentState, assignmentAction, assignmentPending] = useActionState<
    AssignmentFormState,
    FormData
  >(createAssignment, ASSIGNMENT_INITIAL);

  // Derived, not synced via effect: each step's own action success is what
  // advances the wizard, so the current step is just a function of the
  // three action states rather than separate state to keep in sync.
  const courseId = courseState.ok ? (courseState.id ?? null) : null;
  const step = assignmentState.ok ? 4 : courseId ? 3 : settingsState.ok ? 2 : 1;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${
                  done
                    ? "bg-mint text-mint-text"
                    : active
                      ? "bg-violet text-white"
                      : "bg-line text-ink-3"
                }`}
              >
                {done ? "✓" : n}
              </span>
              {n < STEPS.length && <span className="h-0.5 w-6 bg-line" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-card bg-card p-6">
        {step === 1 && (
          <form action={settingsAction} className="flex flex-col gap-3.5">
            <div className="flex flex-col items-center gap-2 pb-1 text-center">
              <Pilo mood="happy" size={64} />
              <h2 className="font-display text-lg font-bold text-foreground">
                How much time can you study each week?
              </h2>
              <p className="text-[12.5px] font-semibold text-ink-3">
                This gates the AI Planner and the Workload Risk score — you can
                change it anytime in Settings.
              </p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-ink-2">
              Weekly availability (hours)
              <input
                name="weeklyAvailabilityHours"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                required
                defaultValue={10}
                className={inputClass(Boolean(settingsState.errors.weeklyAvailabilityHours))}
              />
              {settingsState.errors.weeklyAvailabilityHours && (
                <FieldError as="span" className="text-[11px]">
                  {settingsState.errors.weeklyAvailabilityHours}
                </FieldError>
              )}
            </label>
            {settingsState.formError && (
              <FieldError>{settingsState.formError}</FieldError>
            )}
            <button
              type="submit"
              disabled={settingsPending}
              className="flex min-h-11 items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep disabled:opacity-60"
            >
              {settingsPending ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form action={courseAction} className="flex flex-col gap-3.5">
            <div className="flex flex-col items-center gap-2 pb-1 text-center">
              <Pilo mood="happy" size={64} />
              <h2 className="font-display text-lg font-bold text-foreground">
                Add your first course
              </h2>
              <p className="text-[12.5px] font-semibold text-ink-3">
                Assignments, grades, and schedule all link back to a course.
              </p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-ink-2">
              Course name
              <input
                name="name"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Database Systems"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className={inputClass(Boolean(courseState.errors.name))}
              />
              {courseState.errors.name && (
                <FieldError as="span" className="text-[11px]">
                  {courseState.errors.name}
                </FieldError>
              )}
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-ink-2">
                Code (optional)
                <input
                  name="code"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. CS301"
                  className={inputClass(false)}
                />
              </label>
              <label className="flex w-24 flex-col gap-1 text-xs font-bold text-ink-2">
                Credits
                <input
                  name="credits"
                  type="number"
                  min={1}
                  step={1}
                  required
                  defaultValue={3}
                  className={inputClass(Boolean(courseState.errors.credits))}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-ink-2">
              Semester
              <input
                name="semester"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. 253"
                className={inputClass(Boolean(courseState.errors.semester))}
              />
              {courseState.errors.semester && (
                <FieldError as="span" className="text-[11px]">
                  {courseState.errors.semester}
                </FieldError>
              )}
            </label>
            {courseState.formError && (
              <FieldError>{courseState.formError}</FieldError>
            )}
            <button
              type="submit"
              disabled={coursePending}
              className="flex min-h-11 items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep disabled:opacity-60"
            >
              {coursePending ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {step === 3 && courseId && (
          <form action={assignmentAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="priority" value="medium" />
            <div className="flex flex-col items-center gap-2 pb-1 text-center">
              <Pilo mood="happy" size={64} />
              <h2 className="font-display text-lg font-bold text-foreground">
                Add your first assignment
              </h2>
              <p className="text-[12.5px] font-semibold text-ink-3">
                For {courseName || "your course"} — you can add the rest later.
              </p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-ink-2">
              Title
              <input
                name="title"
                type="text"
                required
                autoComplete="off"
                placeholder="e.g. Homework 1"
                className={inputClass(Boolean(assignmentState.errors.title))}
              />
              {assignmentState.errors.title && (
                <FieldError as="span" className="text-[11px]">
                  {assignmentState.errors.title}
                </FieldError>
              )}
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-ink-2">
                Due date
                <input
                  name="dueAt"
                  type="datetime-local"
                  required
                  className={inputClass(Boolean(assignmentState.errors.dueAt))}
                />
              </label>
              <label className="flex w-24 flex-col gap-1 text-xs font-bold text-ink-2">
                Weight %
                <input
                  name="weight"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  required
                  defaultValue={10}
                  className={inputClass(Boolean(assignmentState.errors.weight))}
                />
              </label>
            </div>
            {assignmentState.formError && (
              <FieldError>{assignmentState.formError}</FieldError>
            )}
            <button
              type="submit"
              disabled={assignmentPending}
              className="flex min-h-11 items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep disabled:opacity-60"
            >
              {assignmentPending ? "Saving…" : "Finish"}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <Pilo mood="happy" size={72} />
            <h2 className="font-display text-lg font-bold text-foreground">You&rsquo;re all set!</h2>
            <p className="text-[12.5px] font-semibold text-ink-3">
              Try a 25-minute focus session on your new assignment, or generate
              an AI study plan whenever you&rsquo;re ready.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-1 flex min-h-11 w-full items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-ctl border px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet ${
    hasError ? "border-coral" : "border-border-subtle focus:border-violet"
  }`;
}
