"use client";

import { useEffect } from "react";
import Link from "next/link";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { reportClientError } from "@/lib/observability/client";

/**
 * SR-02 (docs/PRODUCT_REVIEW_3.md): the app had zero error boundaries
 * despite 20+ server actions that throw — an uncaught error anywhere in a
 * route segment used to fall through to Next.js's bare default error
 * screen, wiping whatever the user was doing. This is the last-resort net;
 * the individual dialogs/forms that already catch and show their own
 * inline error remain the primary path (see FieldError, ArchiveDialog,
 * etc.) — this only fires for what those don't cover.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ships to /api/errors so this lands in the same structured log stream
    // as server errors. The console line stays for local development, where
    // there is no log collector to read.
    console.error(error);
    reportClientError(error, "app/error.tsx");
  }, [error]);

  useEffect(() => {
    // app/layout.tsx's beforeInteractive theme-init <Script> doesn't reach
    // the document when this boundary is the one rendering (verified: its
    // <script id="theme-init"> tag is simply absent from the error-page
    // response's <head>, in both dev and a production build) — so this
    // page would otherwise always render light regardless of the user's
    // actual preference. Re-applies the same logic independently, since
    // this boundary can't assume anything upstream ran.
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      const isDark =
        stored === "dark" ||
        (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {
      // localStorage/matchMedia unavailable — fall back to light, same as
      // the inline script's own try/catch does.
    }
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-display text-2xl font-bold text-foreground">Something went wrong.</p>
      <p className="max-w-sm text-sm font-semibold text-ink-2">
        This page hit an unexpected error. Your data is safe — try again, or head back to the
        Dashboard.
      </p>
      <div className="mt-2 flex gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="flex min-h-11 items-center justify-center rounded-ctl bg-ink px-5 text-sm font-bold text-white hover:bg-ink/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="flex min-h-11 items-center justify-center rounded-ctl bg-line px-5 text-sm font-bold text-ink-2 hover:bg-line-hover"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
