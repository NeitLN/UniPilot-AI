import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
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
    <div className="rounded-card bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-foreground">Today</h2>
        <Link
          href={focusAssignmentId ? `/focus?assignment=${focusAssignmentId}` : "/focus"}
          className="flex min-h-9 items-center rounded-ctl bg-lime px-3 text-[11.5px] font-extrabold text-ink hover:bg-lime-deep"
        >
          Start focus
        </Link>
      </div>

      {blocks.length === 0 ? (
        <EmptyState heading="Nothing today" copy="No classes on the calendar for today." className="py-6" />
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {blocks.map((b) => {
            const tone = b.courseId ? courseTone(b.courseId) : null;
            return (
              <li key={b.id} className="flex items-center gap-2.5 rounded-ctl bg-line px-3 py-2">
                {tone && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${COURSE_TONE_CLASSES[tone].solid}`} />}
                <span className="w-[110px] shrink-0 text-[11.5px] font-bold text-ink-2">
                  {b.isAllDay ? "All day" : `${formatTime(b.startAt)}–${formatTime(b.endAt)}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-foreground">{b.title}</span>
                {b.location && <span className="shrink-0 truncate text-[11px] font-semibold text-ink-3">{b.location}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
