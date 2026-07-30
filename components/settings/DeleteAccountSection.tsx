"use client";

import { useState } from "react";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

/** FR-27 (docs/PRODUCT_REVIEW_2.md) — kept in its own card, away from
 * "Export your data": the two are opposite in intent and shouldn't sit
 * next to each other where a misclick between them is easy. */
export function DeleteAccountSection({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-bold text-ink-2">Danger zone</p>
      <p className="text-[12.5px] font-semibold text-ink-3">
        Permanently delete your account and everything in it.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center justify-center rounded-ctl bg-line px-3.5 text-sm font-bold text-coral hover:bg-[#E6E2F2]"
      >
        Delete account
      </button>

      <DeleteAccountDialog userEmail={userEmail} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
