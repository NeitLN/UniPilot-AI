import Link from "next/link";
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
}: {
  blocks: ClassBlockLite[];
  focusAssignmentId: string | null;
}) {
  return (
    <div className="rounded-card bg-ink p-4 text-white">
      <h2 className="font-display text-sm font-bold text-white">Today</h2>

      {blocks.length === 0 ? (
        <div className="py-6 text-center">
          <p className="font-display text-sm font-bold text-white">Nothing today</p>
          <p className="mt-1 text-[12.5px] font-semibold text-dusk-text">No classes on the calendar for today.</p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {blocks.map((b) => {
            const tone = b.courseId ? courseTone(b.courseId) : null;
            return (
              <li key={b.id} className="flex items-center gap-2.5 rounded-ctl bg-white/8 px-3 py-2">
                {tone && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${COURSE_TONE_CLASSES[tone].solid}`} />}
                <span className="w-[110px] shrink-0 text-[11.5px] font-bold text-dusk-text">
                  {b.isAllDay ? "All day" : `${formatTime(b.startAt)}–${formatTime(b.endAt)}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-white">{b.title}</span>
                {b.location && <span className="shrink-0 truncate text-[11px] font-semibold text-dusk-muted">{b.location}</span>}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={focusAssignmentId ? `/focus?assignment=${focusAssignmentId}` : "/focus"}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-ctl bg-lime px-3 text-sm font-extrabold text-ink hover:bg-lime-deep"
      >
        ▶ Start focus
      </Link>
    </div>
  );
}
