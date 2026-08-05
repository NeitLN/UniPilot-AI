import { BarChart3 } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { COURSE_TONE_CLASSES, courseTone } from "@/lib/ui/course-tone";
import type { CourseLoadSummary as CourseLoadSummaryData } from "@/lib/rules/course-presentation";

export function CourseLoadSummary({ summary }: { summary: CourseLoadSummaryData }) {
  const { totalAssignments, dueThisWeek, distribution } = summary;

  return (
    <div className="flex flex-col gap-3 rounded-card bg-card p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-2 shrink-0">
        <IconChip
          icon={<BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />}
          tone="violet"
        />
        <h2 className="font-display text-sm font-bold text-foreground">Course load</h2>
      </div>

      <div className="flex shrink-0 gap-6">
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{totalAssignments}</p>
          <p className="text-[11px] font-semibold text-ink-3">assignments total</p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{dueThisWeek}</p>
          <p className="text-[11px] font-semibold text-ink-3">due this week</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {totalAssignments === 0 ? (
          <p className="text-[11.5px] font-semibold text-ink-3">Nothing outstanding right now.</p>
        ) : (
          <>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full">
              {distribution.map((d) => {
                const tone = COURSE_TONE_CLASSES[courseTone(d.courseId)];
                return (
                  <div
                    key={d.courseId}
                    className={tone.solid}
                    style={{ width: `${(d.count / totalAssignments) * 100}%` }}
                    title={`${d.courseName}: ${d.count}`}
                  />
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-ink-3">
              {/* Never claims "balanced" when there's only one course to
                  distribute across — that's not a distribution, just a
                  single bucket (brief §3.5). */}
              {distribution.length <= 1
                ? `All outstanding work is in ${distribution[0]?.courseName ?? "one course"}.`
                : `Spread across ${distribution.length} courses.`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
