"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface GenerateButtonProps {
  disabled: boolean;
  disabledReasons: string[];
  label: string;
}

interface GenerateResponse {
  error?: string;
  retryable?: boolean;
  sessionCount?: number;
  rejectedSessions?: unknown[];
}

export function GenerateButton({ disabled, disabledReasons, label }: GenerateButtonProps) {
  const router = useRouter();
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

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={disabled || pending}
        className="rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep disabled:opacity-45"
      >
        {pending ? "Generating…" : label}
      </button>

      {disabled && disabledReasons.length > 0 && (
        <ul className="text-right text-[11.5px] font-semibold text-ink-3">
          {disabledReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {error && (
        <div className="flex items-center gap-2">
          <p role="alert" className="text-[11.5px] font-semibold text-coral-text">
            {error}
          </p>
          {retryable && (
            <button
              type="button"
              onClick={handleGenerate}
              className="text-[11.5px] font-extrabold text-violet hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {result && (
        <p className="text-[11.5px] font-semibold text-mint-text">
          Scheduled {result.sessionCount} session{result.sessionCount === 1 ? "" : "s"}
          {result.rejectedCount > 0
            ? `, ${result.rejectedCount} didn't fit and ${result.rejectedCount === 1 ? "was" : "were"} left out.`
            : "."}
        </p>
      )}
    </div>
  );
}
