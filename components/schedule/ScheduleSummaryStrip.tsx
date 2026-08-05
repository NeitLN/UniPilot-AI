import { BookOpen, CalendarClock, GraduationCap } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { IconChip } from "@/components/ui/IconChip";
import { formatMinutes } from "@/lib/rules/plan-presentation";
import {
  formatClockShort,
  isHappeningNow,
  type ClassBlockLite,
} from "@/lib/rules/schedule-presentation";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";

function minutesUntil(iso: string, now: Date): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
}

export function NextClassCard({ block, now }: { block: ClassBlockLite | null; now: Date }) {
  if (!block) {
    return (
      <div className="flex flex-1 items-center gap-3.5 rounded-card bg-card p-4">
        <IconChip icon={<GraduationCap aria-hidden="true" />} tone="violet" size="lg" square />
        <div>
          <p className="text-[11.5px] font-semibold text-ink-3">Next class</p>
          <p className="mt-0.5 font-display text-base font-bold text-foreground">
            No more classes today
          </p>
        </div>
      </div>
    );
  }

  const happeningNow = isHappeningNow(block, now);
  const minsAway = minutesUntil(block.startAt, now);
  const tone = block.courseId ? COURSE_TONE_CLASSES[courseTone(block.courseId)] : null;

  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-card bg-card p-4">
      <IconChip
        icon={<GraduationCap aria-hidden="true" />}
        tone="violet"
        size="lg"
        square
        colorClassName={tone ? `${tone.tint} ${tone.text}` : undefined}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold text-ink-3">Next class</p>
        <p className="mt-0.5 truncate font-display text-base font-bold text-foreground">
          {block.title}
        </p>
        {/* Time and room stack instead of sharing a "·"-joined line — the
            concept gives each its own row, and a long room name no longer
            pushes the time out of view. AM/PM is dropped here for the same
            reason it is in the grid blocks (see formatClockShort). */}
        <p className="mt-1 text-[12.5px] font-semibold text-ink-2" suppressHydrationWarning>
          {formatClockShort(new Date(block.startAt))}–{formatClockShort(new Date(block.endAt))}
        </p>
        {block.location && (
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink-2">{block.location}</p>
        )}
      </div>
      {happeningNow ? (
        <span className="shrink-0 rounded-pill bg-mint-tint px-2.5 py-1 text-[10.5px] font-extrabold text-mint-text">
          Happening now
        </span>
      ) : (
        minsAway <= 120 && (
          <span className="shrink-0 rounded-pill bg-lime px-2.5 py-1 text-[10.5px] font-extrabold text-ink">
            In {minsAway < 60 ? `${minsAway} min` : `${formatMinutes(minsAway)}`}
          </span>
        )
      )}
    </div>
  );
}

export function ScheduleSummaryStrip({
  nextClassBlock,
  now,
  classesTodayCount,
  coursesTodayCount,
  freeBlockCount,
  freeMinutesTotal,
}: {
  nextClassBlock: ClassBlockLite | null;
  now: Date;
  classesTodayCount: number;
  /** Distinct courses behind today's classes — two lectures for one course
   * is a different day from two lectures for two, which the bare count hides. */
  coursesTodayCount: number;
  freeBlockCount: number;
  freeMinutesTotal: number;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      <NextClassCard block={nextClassBlock} now={now} />
      {/* size="sm" is exactly the 32px slot StatTile already reserves for an
          icon, so tinting these into chips costs the other StatTile callers
          (Focus, GPA) no layout change at all. */}
      <StatTile
        icon={<IconChip icon={<BookOpen aria-hidden="true" />} tone="violet" size="sm" square />}
        label={classesTodayCount === 1 ? "class today" : "classes today"}
        value={String(classesTodayCount)}
        hint={
          coursesTodayCount > 0
            ? `Across ${coursesTodayCount} course${coursesTodayCount === 1 ? "" : "s"}`
            : undefined
        }
        className="flex-1"
      />
      <StatTile
        icon={<IconChip icon={<CalendarClock aria-hidden="true" />} tone="mint" size="sm" square />}
        label={freeBlockCount === 1 ? "free block" : "free blocks"}
        value={String(freeBlockCount)}
        hint={freeBlockCount > 0 ? `${formatMinutes(freeMinutesTotal)} total` : undefined}
        className="flex-1"
      />
    </div>
  );
}
