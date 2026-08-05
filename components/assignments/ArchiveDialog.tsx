"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { archiveAssignment } from "@/app/(app)/assignments/actions";

export interface ArchiveDialogProps {
  assignmentId: string;
  assignmentTitle: string;
  /** FR-24: offers an extra "this and following" scope, mirroring
   * Schedule's DeleteEventDialog for a recurring class_block. */
  isRecurring?: boolean;
  open: boolean;
  onClose: () => void;
}

/** Archiving is destructive-ish (hides the item, cancels its reminder) — confirm first. */
export function ArchiveDialog({
  assignmentId,
  assignmentTitle,
  isRecurring = false,
  open,
  onClose,
}: ArchiveDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(scope: "this" | "following") {
    startTransition(async () => {
      try {
        await archiveAssignment(assignmentId, scope);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't archive this item.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Archive assignment">
      <h2 className="font-display text-lg font-bold text-foreground">Archive assignment?</h2>
      <p className="mt-2 text-sm font-semibold text-ink-2">
        {`"${assignmentTitle}" will be hidden from your list and its reminder cancelled. You can't undo this from here.`}
      </p>

      {error && <FieldError className="mt-2 text-xs">{error}</FieldError>}

      <div className="mt-4 flex flex-col gap-2.5">
        {isRecurring ? (
          <>
            <button
              type="button"
              onClick={() => handleConfirm("this")}
              disabled={pending}
              className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
            >
              {pending ? "Archiving…" : "Archive this assignment"}
            </button>
            <button
              type="button"
              onClick={() => handleConfirm("following")}
              disabled={pending}
              className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
            >
              {pending ? "Archiving…" : "Archive this and following"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => handleConfirm("this")}
            disabled={pending}
            className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
          >
            {pending ? "Archiving…" : "Archive"}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
