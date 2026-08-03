"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AssignmentForm, type CourseOption } from "./AssignmentForm";

export function AddAssignmentButton({
  courses,
  /** "pill" (default) fits the page header; "block" fills its container,
   * used by AssignmentQuickActions' full-width action list. */
  variant = "pill",
}: {
  courses: CourseOption[];
  variant?: "pill" | "block";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "block"
            ? "flex min-h-11 w-full items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep"
            : "flex min-h-11 items-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep"
        }
      >
        Add assignment
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New assignment">
        <AssignmentForm
          courses={courses}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
