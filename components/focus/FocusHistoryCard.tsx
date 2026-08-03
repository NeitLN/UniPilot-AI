import { Clock3 } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { formatMinutes } from "@/lib/rules/focus";
import type { FocusResult, FocusSessionSource } from "@/lib/supabase/types";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";

export interface FocusHistoryEntry {
  id: string;
  assignmentTitle: string;
  courseId: string | null;
  startedAt: string;
  durationSeconds: number;
  result: FocusResult;
  source: FocusSessionSource;
}

const TYPE_LABEL: Record<FocusSessionSource, string> = {
  timer: "Focus",
  manual: "Logged",
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Most recent real sessions (already-sorted, already-fetched by the /focus
 * page for the "By assignment" breakdown) — a horizontally-scrolling strip
 * of actual history rows, concept §5 "Focus history". */
export function FocusHistoryCard({ entries }: { entries: FocusHistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Focus history</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {entries.slice(0, 8).map((e) => {
          const tone = e.courseId ? COURSE_TONE_CLASSES[courseTone(e.courseId)] : null;
          return (
            <div key={e.id} className="w-[190px] shrink-0 rounded-ctl bg-line p-3">
              <IconChip
                icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
                size="sm"
                tone="violet"
                colorClassName={tone ? `${tone.tint} ${tone.text}` : undefined}
              />
              {/* Local-time formatting is expected to differ between SSR and hydration. */}
              <p className="mt-2 text-[11px] font-bold text-ink-3" suppressHydrationWarning>
                {new Date(e.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })},{" "}
                {new Date(e.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
              <p className="mt-0.5 truncate text-[12.5px] font-bold text-foreground">{e.assignmentTitle}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] font-bold text-ink-3">
                <span>⏱ {formatClock(e.durationSeconds)}</span>
                <span className="rounded-pill bg-card px-2 py-0.5 text-[10px] font-extrabold text-ink-2">
                  {TYPE_LABEL[e.source]}
                  {e.result === "partial" ? " · Partial" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="sr-only">
        {entries.length} recent focus session{entries.length === 1 ? "" : "s"}, totaling{" "}
        {formatMinutes(Math.round(entries.reduce((s, e) => s + e.durationSeconds, 0) / 60))}.
      </p>
    </div>
  );
}
