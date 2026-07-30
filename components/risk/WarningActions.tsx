"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markWarningHandled, dismissWarning } from "@/app/(app)/risk/actions";
import { FieldError } from "@/components/ui/FieldError";

export function WarningActions({
  warningId,
  actionTaken,
}: {
  warningId: string;
  actionTaken: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await markWarningHandled(warningId, actionTaken);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that.");
      }
    });
  }

  function handleDismiss() {
    setError(null);
    startTransition(async () => {
      try {
        await dismissWarning(warningId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that.");
      }
    });
  }

  return (
    <div>
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-card py-2.5 text-sm font-bold text-ink-2 hover:bg-white/80 disabled:opacity-60"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white hover:bg-ink/90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Confirm"}
        </button>
      </div>
      {error && <FieldError className="mt-2 text-[11.5px]">{error}</FieldError>}
    </div>
  );
}
