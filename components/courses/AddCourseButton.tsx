"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CourseForm } from "./CourseForm";

export function AddCourseButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center rounded-ctl bg-line px-4 py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
      >
        Add course
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New course">
        <CourseForm onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}
