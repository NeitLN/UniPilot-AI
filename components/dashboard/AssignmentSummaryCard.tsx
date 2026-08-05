import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Pilo } from "@/components/brand/Pilo";
import { Tag } from "@/components/ui/Tag";
import { FadeIn } from "@/components/motion/FadeIn";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";
import { overdueLabel, priorityLabel, statusLabel } from "@/lib/rules/assignment";
import type { AssignmentPriority, AssignmentStatus } from "@/lib/supabase/types";

export interface SummaryAssignment {
  id: string;
  title: string;
  /** Drives the row's accent color via the same stable per-course hash used
   * on Schedule/Courses/GPA — null (no course) falls back to neutral. */
  courseId: string | null;
  courseName: string | null;
  dueAt: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  archivedAt: string | null;
}

export function AssignmentSummaryCard({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: SummaryAssignment[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        <Link
          href="/assignments"
          className="flex min-h-11 items-center text-[12.5px] font-extrabold text-violet-text hover:underline"
        >
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <FadeIn className="flex flex-col items-center gap-2 py-6 text-center">
          <Pilo mood="sleepy" size={56} />
          <p className="text-[12.5px] font-semibold text-ink-2">{emptyMessage}</p>
        </FadeIn>
      ) : (
        <ul className="mt-1">
          {items.map((a) => {
            const overdue = overdueLabel(a);
            const tone = a.courseId ? COURSE_TONE_CLASSES[courseTone(a.courseId)] : null;
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 border-t border-line py-[11px] first:border-t-0 first:pt-3"
              >
                {/* One consistent glyph, tinted per course — the schema has
                    no subject field, so varying the icon by course would be
                    inventing meaning the data can't back. */}
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl ${
                    tone ? `${tone.tint} ${tone.text}` : "bg-line text-ink-3"
                  }`}
                >
                  <ClipboardList className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{a.title}</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-semibold text-ink-3">
                    {a.courseName ?? "No course"} ·{" "}
                    {new Date(a.dueAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {overdue ? (
                  <Tag tone="coral">{overdue}</Tag>
                ) : a.priority === "high" ? (
                  <Tag tone="tangerine">{priorityLabel(a)}</Tag>
                ) : (
                  <Tag tone="neutral">{statusLabel(a)}</Tag>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AssignmentSummarySkeleton({ title }: { title: string }) {
  return (
    <div className="animate-pulse rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      <div className="mt-3 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-ctl bg-line" />
        ))}
      </div>
    </div>
  );
}
