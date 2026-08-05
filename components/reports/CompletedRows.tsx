import { Check, ChevronRight } from "lucide-react";
import { COURSE_TONE_CLASSES, courseTone } from "@/lib/ui/course-tone";

export interface CompletedRow {
  id: string;
  title: string;
  courseId: string | null;
  courseName: string | null;
  completedAt: string;
}

/**
 * Uses the real `completed_at` column (0017_assignment_completed_at.sql),
 * not `updated_at` — the previous version's proxy over-counted anything
 * merely edited again this week (brief §7.2/§7.8).
 *
 * PROD-05: the mockup shows two labels here, "Submitted" and "Completed".
 * There is one terminal state in the schema, so a "Submitted" label would
 * be invented from data that does not exist. Decided against splitting it
 * (docs/DESIGN_PIXEL_MATCH_GAP_REVIEW.md, W9): for a student the two are
 * nearly always the same moment, and a distinction nobody maintains
 * produces wrong labels — worse than one honest one. This single label is
 * a deliberate divergence from the design, not an oversight.
 */
export function CompletedRows({ rows }: { rows: CompletedRow[] }) {
  if (rows.length === 0) return null;

  return (
    // No heading: the concept lets the rows speak for themselves, and each
    // one already says "Completed" beside its own check.
    <ul className="flex flex-col rounded-card bg-card px-5 py-1.5">
      {rows.slice(0, 3).map((r) => {
        const tone = r.courseId ? COURSE_TONE_CLASSES[courseTone(r.courseId)] : null;
        return (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-3.5 first:border-t-0"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint text-white"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="shrink-0 text-[12.5px] font-semibold text-ink-3">Completed</span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">
              {r.title}
            </span>
            {tone && (
              <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink-3">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${tone.solid}`} />
                {r.courseName}
              </span>
            )}
            {/* Local-time formatting differs SSR vs hydration by design. */}
            <span
              className="shrink-0 text-[12px] font-semibold text-ink-3"
              suppressHydrationWarning
            >
              {new Date(r.completedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          </li>
        );
      })}
    </ul>
  );
}
