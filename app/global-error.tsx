"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client";

/**
 * SR-02 (docs/PRODUCT_REVIEW_3.md): fires only when the root layout itself
 * throws (fonts, the theme-init script, etc.) — app/error.tsx can't catch
 * that since it renders *inside* the layout. Next.js requires this file to
 * render its own <html>/<body>. Deliberately plain inline styles rather
 * than Tailwind classes or design tokens: this is the one place that must
 * not assume anything else in the app (globals.css, the theme script) is
 * working.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // This boundary fires when the root layout itself failed, which is the
    // case least likely to be reproduced locally — so it is the one most
    // worth getting off the user's machine.
    reportClientError(error, "app/global-error.tsx");
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F2F0FB",
          color: "#1A1330",
        }}
      >
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          UniPilot AI hit an unexpected error.
        </p>
        <p style={{ maxWidth: 360, fontSize: 14, fontWeight: 600, margin: 0, opacity: 0.75 }}>
          Your data is safe — try reloading the page.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            minHeight: 44,
            padding: "0 20px",
            borderRadius: 12,
            border: "none",
            background: "#1A1330",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
