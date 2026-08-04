/** Single source of truth for the Focus Timer's localStorage key, shared
 * with NotificationBellClient so "quiet while you focus" (concept §10.3's
 * footnote) reads the exact same state FocusTimer itself persists, instead
 * of a second, potentially-drifting copy of the same check. */
export const FOCUS_SESSION_STORAGE_KEY = "unipilot:focus:session";

/** True only while a work phase (not a break, not paused) is actually
 * running — the real condition "stay quiet while you focus" describes. */
export function isFocusWorkActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(FOCUS_SESSION_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { phase?: string; pausedAt?: string | null } | null;
    return parsed?.phase === "work" && !parsed.pausedAt;
  } catch {
    return false;
  }
}
