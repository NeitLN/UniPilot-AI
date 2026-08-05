import Link from "next/link";
import { MapPin, Play } from "lucide-react";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";
import type { ClassBlockLite } from "@/lib/rules/schedule-presentation";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** `hasActiveAssignment` decides whether "Start focus" preselects a real
 * assignment or just links to /focus plain — never a fabricated preselect
 * (brief §2.4). */
export function TodayAgendaCard({
  blocks,
  focusAssignmentId,
  now = new Date(),
}: {
  blocks: ClassBlockLite[];
  focusAssignmentId: string | null;
  /** Passed in so the header date is rendered from the server's single
   * `now`, matching every other "today" figure on the page. */
  now?: Date;
}) {
  return (
    <div className="rounded-card bg-ink p-4 text-white">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-bold text-white">Today</h2>
        {/* Local-date formatting differs SSR vs hydration by design. */}
        <p className="text-[11.5px] font-semibold text-dusk-muted" suppressHydrationWarning>
          {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="py-6 text-center">
          <p className="font-display text-sm font-bold text-white">Nothing today</p>
          <p className="mt-1 text-[12.5px] font-semibold text-dusk-text">
            No classes on the calendar for today.
          </p>
        </div>
      ) : (
        // Timeline rail: one continuous line behind the row dots, rather
        // than the previous set of detached pill rows — it's what makes the
        // list read as a sequence through the day (concept §8).
        <ul className="relative mt-3 flex flex-col gap-3 pl-4">
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-[3px] top-2 w-px bg-white/15"
          />
          {blocks.map((b) => {
            const tone = b.courseId ? courseTone(b.courseId) : null;
            return (
              <li key={b.id} className="relative flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`absolute -left-4 top-1 h-2 w-2 rounded-full ring-2 ring-ink ${
                    tone ? COURSE_TONE_CLASSES[tone].solid : "bg-dusk-btn"
                  }`}
                />
                <div className="w-[68px] shrink-0 text-[11.5px] font-bold" suppressHydrationWarning>
                  {b.isAllDay ? (
                    <span className="text-dusk-text">All day</span>
                  ) : (
                    <>
                      <span className="block text-white">{formatTime(b.startAt)}</span>
                      <span className="block text-dusk-muted">{formatTime(b.endAt)}</span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-white">{b.title}</p>
                  {b.location && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-dusk-muted">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{b.location}</span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={focusAssignmentId ? `/focus?assignment=${focusAssignmentId}` : "/focus"}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-ctl bg-lime px-3 text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
        Start focus
      </Link>
    </div>
  );
}
