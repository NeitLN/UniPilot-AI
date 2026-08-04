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

  const entries = [
    ...top.map((c) => ({
      key: c.courseId,
      name: c.courseName,
      minutes: c.minutes,
      dot: COURSE_TONE_CLASSES[courseTone(c.courseId)].solid,
    })),
    ...(otherMinutes > 0
      ? // Not bg-line: the swatch and its own track share that token, so the
        // "Other" dot and bar were invisible against them.
        [{ key: "__other__", name: `Other (${rest.length})`, minutes: otherMinutes, dot: "bg-ink-3" }]
      : []),
  ];

  return (
    <div>
      <p className="text-[13px] font-bold text-foreground">Where your time went</p>
      {/* Side by side with a share bar each, rather than a stacked list of
          right-aligned numbers — the concept compares the courses against
          one another, which a column of text can't show. */}
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => {
          const pct = Math.round((e.minutes / total) * 100);
          return (
            <div key={e.key} className="min-w-0">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
                <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${e.dot}`} />
                <span className="min-w-0 truncate">{e.name}</span>
              </p>
              <p className="mt-1.5 text-[13px] font-bold text-foreground tabular-nums">
                {formatMinutes(e.minutes)} <span className="font-semibold text-ink-3">({pct}%)</span>
              </p>
              <span aria-hidden="true" className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-line">
                <span className={`block h-full rounded-full ${e.dot}`} style={{ width: `${pct}%` }} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
