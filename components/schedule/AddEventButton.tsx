"use client";

import { useState } from "react";
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
        className="flex min-h-11 items-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep"
      >
        New event
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New event" size="lg">
        <EventForm
          courses={courses}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
