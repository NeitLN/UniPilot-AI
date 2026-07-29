"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AssignmentForm, type CourseOption } from "./AssignmentForm";

export function AddAssignmentButton({ courses }: { courses: CourseOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep"
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
