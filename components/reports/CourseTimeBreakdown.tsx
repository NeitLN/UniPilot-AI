import { COURSE_TONE_CLASSES, courseTone } from "@/lib/ui/course-tone";
import { formatMinutes } from "@/lib/rules/focus";

export interface CourseMinutes {
  courseId: string;
  courseName: string;
  minutes: number;
}

const TOP_N = 3;

/** Top N courses by time this week, the rest folded into "Other" — real
 * numbers throughout, never padded to make the split look tidier. */
export function CourseTimeBreakdown({ courses }: { courses: CourseMinutes[] }) {
  const sorted = [...courses].filter((c) => c.minutes > 0).sort((a, b) => b.minutes - a.minutes);
  if (sorted.length === 0) return null;

  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  const otherMinutes = rest.reduce((s, c) => s + c.minutes, 0);
  const total = sorted.reduce((s, c) => s + c.minutes, 0);

  return (
    <div>
      <p className="text-xs font-bold text-ink-2">Where your time went</p>
      <div className="mt-2 flex flex-col gap-2">
        {top.map((c) => {
          const tone = COURSE_TONE_CLASSES[courseTone(c.courseId)];
          const pct = Math.round((c.minutes / total) * 100);
          return (
            <div key={c.courseId} className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.solid}`} />
              <span className="min-w-0 flex-1 truncate">{c.courseName}</span>
              <span className="shrink-0 tabular-nums text-ink-3">
                {formatMinutes(c.minutes)} ({pct}%)
              </span>
            </div>
          );
        })}
        {otherMinutes > 0 && (
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-line" />
            <span className="min-w-0 flex-1 truncate">Other ({rest.length})</span>
            <span className="shrink-0 tabular-nums text-ink-3">
              {formatMinutes(otherMinutes)} ({Math.round((otherMinutes / total) * 100)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
