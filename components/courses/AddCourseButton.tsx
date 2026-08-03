"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CourseForm } from "./CourseForm";

const VARIANT_CLASSES = {
  // Schedule header: secondary, sits beside the primary "Add event" action.
  neutral: "bg-line text-ink-2 hover:bg-line-hover",
  // Courses page header: the page's own primary action (concept §9).
  primary: "bg-violet text-white hover:bg-violet-deep",
} as const;

export function AddCourseButton({ variant = "neutral" }: { variant?: keyof typeof VARIANT_CLASSES }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 items-center gap-1.5 rounded-ctl px-4 py-2.5 text-sm font-bold ${VARIANT_CLASSES[variant]}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add course
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New course">
        <CourseForm onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
