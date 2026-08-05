"use client";

import { useRef, useState } from "react";
import { ChevronRight, Clock3 } from "lucide-react";
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

/** How many sessions the strip shows before "View all history" is offered.
 * The page fetches 60 days, so the rest are already in hand — this is purely
 * about not opening on an unreadably long strip. */
const COLLAPSED_COUNT = 8;

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** "Today, 10:30 AM" beats "Aug 4, 10:30 AM" for the sessions people
 * actually scan for, and falls back to the date once that stops being
 * useful. Compared on calendar day in the viewer's own timezone. */
function formatWhen(iso: string, now: Date): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = Math.floor(
    (startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  if (daysAgo === 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

/** Most recent real sessions (already-sorted, already-fetched by the /focus
 * page for the "By assignment" breakdown) — a horizontally-scrolling strip
 * of actual history rows, concept §5 "Focus history". */
export function FocusHistoryCard({ entries }: { entries: FocusHistoryEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const now = new Date();

  if (entries.length === 0) return null;

  const shown = expanded ? entries : entries.slice(0, COLLAPSED_COUNT);
  const hasMore = entries.length > COLLAPSED_COUNT;

  return (
    <div className="flex min-w-0 flex-col rounded-card bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">Focus history</h2>
        <div className="flex shrink-0 items-center gap-2">
          {/* A real control, not a link to a page that doesn't exist: the
              strip is capped at COLLAPSED_COUNT and this reveals the rest. */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              // min-h-6 + the negative-margin padding clears the 24px
              // minimum target size without adding any visible weight —
              // styled by type alone this measured 23px tall.
              className="-mx-1 flex min-h-6 items-center px-1 text-[12.5px] font-bold text-violet-text hover:underline"
            >
              {expanded ? "Show less" : "View all history"}
            </button>
          )}
          {/* In the header, not floating over the strip: overlaid, it sat on
              top of whichever card happened to scroll under it. */}
          {shown.length > 1 && (
            <button
              type="button"
              aria-label="Scroll history forward"
              onClick={() => stripRef.current?.scrollBy({ left: 240, behavior: "smooth" })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-cb bg-card text-ink-2 hover:bg-line"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div>
        {/* Scrollbar hidden — the native bar rendered as a thick grey slab
            across the card's foot. The header chevron is the affordance. */}
        <div
          ref={stripRef}
          className="mt-3 flex gap-3 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((e) => {
            const tone = e.courseId ? COURSE_TONE_CLASSES[courseTone(e.courseId)] : null;
            return (
              <div key={e.id} className="w-[190px] shrink-0 rounded-ctl bg-line p-3">
                <IconChip
                  icon={<Clock3 aria-hidden="true" />}
                  size="sm"
                  tone="violet"
                  colorClassName={tone ? `${tone.tint} ${tone.text}` : undefined}
                />
                {/* Local-time formatting is expected to differ between SSR and hydration. */}
                <p className="mt-2 text-[11px] font-bold text-ink-3" suppressHydrationWarning>
                  {formatWhen(e.startedAt, now)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] font-bold text-foreground">
                  {e.assignmentTitle}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] font-bold text-ink-3">
                  {/* Was a bare "⏱" emoji, which the pixel-match spec rules
                      out and which rendered at a different size per platform. */}
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {formatClock(e.durationSeconds)}
                  </span>
                  <span className="rounded-pill bg-mint-tint px-2 py-0.5 text-[10px] font-extrabold text-mint-text">
                    {TYPE_LABEL[e.source]}
                    {e.result === "partial" ? " · Partial" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="sr-only">
        {entries.length} recent focus session{entries.length === 1 ? "" : "s"}, totaling{" "}
        {formatMinutes(Math.round(entries.reduce((s, e) => s + e.durationSeconds, 0) / 60))}.
      </p>
    </div>
  );
}
