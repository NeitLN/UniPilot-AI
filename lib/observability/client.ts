"use client";

/**
 * DEVOPS-02 — ships a client-side error to the server so it lands in the
 * same log stream as everything else. Without this an error boundary is the
 * end of the road: the stack exists only in that one browser's console.
 *
 * Every failure mode here is swallowed on purpose. This runs from inside an
 * error handler, so throwing would turn one broken render into two, and the
 * boundary's job — showing the user something usable — matters more than
 * the report arriving.
 */
export function reportClientError(
  error: Error & { digest?: string },
  source: string,
): void {
  try {
    const body = JSON.stringify({
      message: error.message,
      stack: error.stack,
      name: error.name,
      digest: error.digest,
      source,
    });

    // sendBeacon survives the page being navigated away or closed, which a
    // fetch() from an error boundary often does not. Falls back to fetch
    // with keepalive where it is unavailable.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never be the reason a page stays broken.
  }
}
