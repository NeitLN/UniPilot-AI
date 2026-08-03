import { COURSE_TONE_CLASSES, courseTone } from "@/lib/ui/course-tone";

export interface CompletedRow {
  id: string;
  title: string;
  courseId: string | null;
  courseName: string | null;
  completedAt: string;
}

/** Uses the real `completed_at` column (0017_assignment_completed_at.sql),
 * not `updated_at` — the previous version's proxy over-counted anything
 * merely edited again this week (brief §7.2/§7.8). */
export function CompletedRows({ rows }: { rows: CompletedRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Completed this week</h2>
      <ul className="mt-3 flex flex-col gap-1">
        {rows.slice(0, 3).map((r) => {
          const tone = r.courseId ? COURSE_TONE_CLASSES[courseTone(r.courseId)] : null;
          return (
            <li key={r.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint-tint text-mint-text">
                ✓
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{r.title}</span>
              {tone && (
                <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[10.5px] font-extrabold ${tone.tint} ${tone.text}`}>
                  {r.courseName}
                </span>
              )}
              <span className="shrink-0 text-[11.5px] font-semibold text-ink-3">
                {new Date(r.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
