"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GradeForm } from "./GradeForm";
import type { CourseOption } from "@/components/assignments/AssignmentForm";

export function AddGradeButton({ courses }: { courses: CourseOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add grade
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New grade">
        <GradeForm
          courses={courses}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
