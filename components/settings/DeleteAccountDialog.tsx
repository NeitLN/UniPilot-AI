"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { deleteAccount } from "@/app/(app)/settings/actions";

export interface DeleteAccountDialogProps {
  userEmail: string;
  open: boolean;
  onClose: () => void;
}

/** FR-27 (docs/PRODUCT_REVIEW_2.md) — the counterpart to "Export your
 * data": deletes the account and every row it owns (cascade, see
 * actions.ts), for good. Same type-your-email confirmation weight as
 * FR-25's permanent-delete, but for everything at once. */
export function DeleteAccountDialog({ userEmail, open, onClose }: DeleteAccountDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matches = confirmEmail.trim() === userEmail;

  function handleClose() {
    setConfirmEmail("");
    setError(null);
    onClose();
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("confirmEmail", confirmEmail.trim());
        await deleteAccount(formData);
        // Hard navigation, not router.push — the session this account
        // just deleted shouldn't linger in any client-side router state.
        window.location.href = "/login?deleted=1";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete this account.");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Delete account">
      <h2 className="font-display text-lg font-bold text-foreground">
        Delete your account permanently?
      </h2>
      <p className="mt-2 text-sm font-semibold text-ink-2">
        This removes every assignment, course, grade, schedule event, focus session, and plan you
        have — for good, with no way back. If you want a copy first, use &ldquo;Export your
        data&rdquo; below before continuing.
      </p>

      <label className="mt-4 flex flex-col gap-1 text-xs font-bold text-ink-2">
        {`Type "${userEmail}" to confirm`}
        <input
          type="email"
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          className="w-full rounded-ctl border border-border-subtle px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet focus:border-violet"
        />
      </label>

      {error && <FieldError className="mt-2 text-xs">{error}</FieldError>}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={handleClose}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending || !matches}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete account"}
        </button>
      </div>
    </Modal>
  );
}
