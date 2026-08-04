import Link from "next/link";
import { Pilo } from "@/components/brand/Pilo";
import { Tag } from "@/components/ui/Tag";
import { FadeIn } from "@/components/motion/FadeIn";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";

export interface AgendaEntry {
  id: string;
  /** "class" rows come from class_blocks, "focus" rows from the confirmed
   * plan's study_sessions — both are real scheduled time, so they share one
   * chronological list rather than two competing "today" surfaces. */
  kind: "class" | "focus";
  title: string;
  subtitle: string | null;
  startAt: string;
  endAt: string;
  /** Null for focus sessions and for classes with no linked course. */
  courseId: string | null;
  isAllDay: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Mirrors ScheduleSummaryStrip's "In N min" wording so the dashboard and
 * the Schedule page never describe the same upcoming block differently. */
function statusFor(entry: AgendaEntry, now: Date): { label: string; tone: "mint" | "neutral" } {
  const start = new Date(entry.startAt).getTime();
  const end = new Date(entry.endAt).getTime();
  const nowMs = now.getTime();

  if (entry.isAllDay) return { label: "All day", tone: "neutral" };
  if (start <= nowMs && nowMs < end) return { label: "Now", tone: "mint" };
  if (nowMs >= end) return { label: "Done", tone: "neutral" };

  const minsAway = Math.round((start - nowMs) / 60000);
  if (minsAway <= 120) return { label: `In ${minsAway} min`, tone: "mint" };
  return { label: "Planned", tone: "neutral" };
}

export function TodayAgendaCard({ entries, now }: { entries: AgendaEntry[]; now: Date }) {
  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Today</h2>
        <Link
          href="/schedule"
          className="flex min-h-11 items-center text-[12.5px] font-extrabold text-violet hover:underline"
        >
          View all
        </Link>
      </div>

      {entries.length === 0 ? (
        <FadeIn className="flex flex-col items-center gap-2 py-6 text-center">
          <Pilo mood="sleepy" size={56} />
          <p className="text-[12.5px] font-semibold text-ink-2">Nothing scheduled today.</p>
        </FadeIn>
      ) : (
        <ul className="mt-1">
          {entries.map((e) => {
            const status = statusFor(e, now);
            const dotClass = e.courseId
              ? COURSE_TONE_CLASSES[courseTone(e.courseId)].solid
              : e.kind === "focus"
                ? "bg-violet"
                : "bg-ink-3";
            return (
              <li
                key={`${e.kind}-${e.id}`}
                className="flex items-center gap-3 border-t border-line py-[11px] first:border-t-0 first:pt-3"
              >
                <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
                {/* Local-time formatting is expected to differ between SSR
                    and hydration — same pattern as every other time label. */}
                <div
                  className="w-[74px] shrink-0 text-[11.5px] font-bold text-ink-2"
                  suppressHydrationWarning
                >
                  {e.isAllDay ? (
                    "All day"
                  ) : (
                    <>
                      <span className="block">{formatTime(e.startAt)}</span>
                      <span className="block text-ink-3">{formatTime(e.endAt)}</span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{e.title}</p>
                  {e.subtitle && (
                    <p className="mt-0.5 truncate text-[11.5px] font-semibold text-ink-3">{e.subtitle}</p>
                  )}
                </div>
                <Tag tone={status.tone}>{status.label}</Tag>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function TodayAgendaSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Today</h2>
      <div className="mt-3 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-ctl bg-line" />
        ))}
      </div>
    </div>
  );
}
