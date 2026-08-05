"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

/** FR-27 (docs/PRODUCT_REVIEW_2.md) — kept in its own card, away from
 * "Export your data": the two are opposite in intent and shouldn't sit
 * next to each other where a misclick between them is easy. */
export function DeleteAccountSection({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-bold text-ink-2">Danger zone</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-ctl bg-coral-tint px-4 py-3 text-left hover:bg-coral-tint/80"
      >
        <IconChip
          icon={<Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />}
          tone="coral"
          size="sm"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-coral-text">Delete account</span>
          <span className="block text-[11.5px] font-semibold text-coral-text/80">
            Permanently delete your account and all your data
          </span>
        </span>
        <span aria-hidden="true" className="text-coral-text">
          ›
        </span>
      </button>

      <DeleteAccountDialog userEmail={userEmail} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
