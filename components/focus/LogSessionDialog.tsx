"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileClock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { inputClass } from "@/components/ui/Field";
import { logManualFocusSession } from "@/app/(app)/focus/actions";
import {
  validateManualSession,
  POMODORO_SECONDS,
  type ManualSessionFieldErrors,
} from "@/lib/rules/focus";

export interface FocusAssignmentOption {
  id: string;
  title: string;
}

/** `YYYY-MM-DDTHH:mm` in the viewer's local time, for the datetime-local
 * input's `max` — matches the same conversion AssignmentItem.tsx already
 * uses for editing due dates, kept local here since the two have no
 * shared caller worth introducing an import for. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const INITIAL_ERRORS: ManualSessionFieldErrors = {};

export function LogSessionDialog({ assignments }: { assignments: FocusAssignmentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<ManualSessionFieldErrors>(INITIAL_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const assignmentId = String(formData.get("assignmentId") ?? "");
    const startedAt = String(formData.get("startedAt") ?? "");
    const durationMinutes = Number(formData.get("durationMinutes"));

    // Same validateManualSession the server re-checks with — mirrored here
    // only for instant per-field feedback, never trusted as the real gate.
    const fieldErrors = validateManualSession({ startedAt, durationMinutes });
    if (!assignmentId) {
      setFormError("Pick an assignment.");
      return;
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors(INITIAL_ERRORS);

    startTransition(async () => {
      const result = await logManualFocusSession({ assignmentId, startedAt, durationMinutes });
      if (!result.ok) {
        setFormError(result.error ?? "Couldn't log this session.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleClose() {
    setOpen(false);
    setErrors(INITIAL_ERRORS);
    setFormError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-ctl border border-border-cb bg-card px-4 py-2.5 text-sm font-bold text-ink-2 hover:bg-line"
      >
        <FileClock className="h-4 w-4 shrink-0 text-violet-text" aria-hidden="true" />
        Log session
      </button>

      <Modal open={open} onClose={handleClose} title="Log a past session">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <h2 className="font-display text-lg font-bold text-foreground">Log a past session</h2>
          <p className="text-[12.5px] font-semibold text-ink-3">
            Studied without the timer running — on paper, offline, somewhere else? Add it here
            so it counts toward your streak and minutes.
          </p>

          <label className="flex flex-col gap-1 text-xs font-bold text-ink-2">
            Assignment
            <select
              name="assignmentId"
              required
              disabled={assignments.length === 0}
              className="w-full rounded-ctl border border-border-subtle bg-card px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60"
            >
              <option value="" disabled>
                {assignments.length === 0 ? "No active assignments" : "Select an assignment…"}
              </option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-ink-2">
              Started at
              <input
                name="startedAt"
                type="datetime-local"
                required
                max={toLocalInputValue(new Date())}
                className={inputClass(Boolean(errors.startedAt))}
              />
              {errors.startedAt && (
                <FieldError as="span" className="text-[11px]">
                  {errors.startedAt}
                </FieldError>
              )}
            </label>

            <label className="w-32 flex flex-col gap-1 text-xs font-bold text-ink-2">
              Minutes
              <input
                name="durationMinutes"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                placeholder="e.g. 45"
                className={inputClass(Boolean(errors.durationMinutes))}
              />
              {errors.durationMinutes && (
                <FieldError as="span" className="text-[11px]">
                  {errors.durationMinutes}
                </FieldError>
              )}
            </label>
          </div>

          <p className="text-[11px] font-semibold text-ink-3">
            {`${POMODORO_SECONDS / 60}+ minutes counts as a completed cycle toward your streak — anything shorter logs as partial, same as the timer.`}
          </p>

          {formError && <FieldError>{formError}</FieldError>}

          <div className="mt-1 flex gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || assignments.length === 0}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white hover:bg-ink/90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Log session"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

