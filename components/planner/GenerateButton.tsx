"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { FieldError } from "@/components/ui/FieldError";
import { FieldSuccess } from "@/components/ui/FieldSuccess";

export interface GenerateButtonProps {
  disabled: boolean;
  disabledReasons: string[];
  label: string;
  /** "violet" (default) fits the page header on the canvas background;
   * "lime" fits when embedded inside PlannerHero's violet card (Ended/Empty
   * states) where a violet button would have too little contrast. */
  variant?: "violet" | "lime";
}

interface GenerateResponse {
  error?: string;
  retryable?: boolean;
  sessionCount?: number;
  rejectedSessions?: unknown[];
}

export function GenerateButton({
  disabled,
  disabledReasons,
  label,
  variant = "violet",
}: GenerateButtonProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [result, setResult] = useState<{ sessionCount: number; rejectedCount: number } | null>(
    null,
  );

  async function handleGenerate() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/plan/generate", { method: "POST" });
      const body: GenerateResponse = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Couldn't generate a plan.");
        setRetryable(Boolean(body.retryable));
        return;
      }
      setResult({
        sessionCount: body.sessionCount ?? 0,
        rejectedCount: body.rejectedSessions?.length ?? 0,
      });
      router.refresh();
    } catch {
      setError("Couldn't reach the server — check your connection.");
      setRetryable(true);
    } finally {
      setPending(false);
    }
  }

  const blocked = disabled || !isOnline;
  const reasons = !isOnline
    ? ["AI Planner needs a connection — reconnect and try again.", ...disabledReasons]
    : disabledReasons;
  const buttonClass =
    variant === "lime"
      ? "bg-lime text-ink hover:bg-lime-deep"
      : "bg-violet text-white hover:bg-violet-deep";
  const reasonsClass = variant === "lime" ? "text-white/75" : "text-ink-3";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={blocked || pending}
        className={`flex min-h-11 items-center gap-1.5 rounded-ctl px-4 py-2.5 text-sm font-bold disabled:opacity-45 ${buttonClass}`}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {pending ? "Generating…" : label}
      </button>

      {blocked && reasons.length > 0 && (
        <ul className={`text-right text-[11.5px] font-semibold ${reasonsClass}`}>
          {reasons.map((r) => (
            <li key={r}>
              {r}
              {r.includes("weekly availability") && (
                <>
                  {" "}
                  <Link
                    href="/settings"
                    className={`font-extrabold hover:underline ${variant === "lime" ? "text-white" : "text-violet-text"}`}
                  >
                    Set it now →
                  </Link>
                </>
              )}
              {r.includes("Add at least one assignment") && (
                <>
                  {" "}
                  <Link
                    href="/assignments"
                    className={`font-extrabold hover:underline ${variant === "lime" ? "text-white" : "text-violet-text"}`}
                  >
                    Add one now →
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="flex items-center gap-2">
          <FieldError className="text-[11.5px]">{error}</FieldError>
          {retryable && (
            <button
              type="button"
              onClick={handleGenerate}
              className="text-[11.5px] font-extrabold text-violet-text hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {result && (
        <FieldSuccess className="text-[11.5px]">
          Scheduled {result.sessionCount} session{result.sessionCount === 1 ? "" : "s"}
          {result.rejectedCount > 0
            ? `, ${result.rejectedCount} didn't fit and ${result.rejectedCount === 1 ? "was" : "were"} left out.`
            : "."}
        </FieldSuccess>
      )}
    </div>
  );
}
