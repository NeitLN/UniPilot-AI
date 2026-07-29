"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { archiveAssignment } from "@/app/(app)/assignments/actions";

export interface ArchiveDialogProps {
  assignmentId: string;
  assignmentTitle: string;
  open: boolean;
  onClose: () => void;
}

/** Archiving is destructive-ish (hides the item, cancels its reminder) — confirm first. */
export function ArchiveDialog({
  assignmentId,
  assignmentTitle,
  open,
  onClose,
}: ArchiveDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      try {
        await archiveAssignment(assignmentId);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't archive this item.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Archive assignment">
      <h2 className="font-display text-lg font-bold text-ink">
        Archive assignment?
      </h2>
      <p className="mt-2 text-sm font-semibold text-ink-2">
        {`"${assignmentTitle}" will be hidden from your list and its reminder cancelled. You can't undo this from here.`}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-coral-text">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
        >
          {pending ? "Archiving…" : "Archive"}
        </button>
      </div>
    </Modal>
  );
}
