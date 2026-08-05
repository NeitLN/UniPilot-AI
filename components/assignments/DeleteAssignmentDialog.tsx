"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { deleteAssignmentPermanently } from "@/app/(app)/assignments/actions";

export interface DeleteAssignmentDialogProps {
  assignmentId: string;
  assignmentTitle: string;
  open: boolean;
  onClose: () => void;
}

/** FR-25 (docs/PRODUCT_REVIEW.md): the last stop before an assignment is
 * gone for good — only ever reachable from the Archived filter, on a row
 * that's already been through archiveAssignment once. */
export function DeleteAssignmentDialog({
  assignmentId,
  assignmentTitle,
  open,
  onClose,
}: DeleteAssignmentDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteAssignmentPermanently(assignmentId);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete this assignment.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete permanently">
      <h2 className="font-display text-lg font-bold text-foreground">
        Delete &ldquo;{assignmentTitle}&rdquo; permanently?
      </h2>
      <p className="mt-2 text-sm font-semibold text-ink-2">
        This removes the assignment itself — its title, notes, and due date — for good. Any focus
        sessions you logged against it are kept and still count toward your streak and minutes;
        they&rsquo;ll just show as &ldquo;Unassigned&rdquo; instead of this title.
      </p>

      {error && <FieldError className="mt-2 text-xs">{error}</FieldError>}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </Modal>
  );
}
