"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EventForm } from "./EventForm";
import type { CourseOption } from "@/components/assignments/AssignmentForm";

export function AddEventButton({ courses }: { courses: CourseOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep"
      >
        <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
        Add event
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add event" size="lg">
        <EventForm
          courses={courses}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
