/** Google Calendar's square mark, drawn rather than fetched so everything
 * that shows it stays self-contained (no remote asset, works offline).
 * Shared by the header's SyncCalendarButton and the right rail's
 * SyncStatusBar — concept §8 shows the same mark in both places. */
export function GoogleCalendarMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="3"
        fill="#fff"
        stroke="#4285F4"
        strokeWidth="1.8"
      />
      <path d="M3 8.5h18" stroke="#4285F4" strokeWidth="1.8" />
      <rect x="8.5" y="11.5" width="7" height="6.5" rx="1" fill="#4285F4" />
    </svg>
  );
}
