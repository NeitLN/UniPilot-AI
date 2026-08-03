"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteStudySession, updateStudySession } from "@/app/(app)/planner/actions";
import { Tag } from "@/components/ui/Tag";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";
import type { DayTab, PlanSessionLite } from "@/lib/rules/plan-presentation";

export interface PlannerWeekViewProps {
  dayTabs: DayTab[];
  /** Keyed by dayKey (see groupSessionsByViewerDay). */
  sessionsByDay: Record<string, PlanSessionLite[]>;
  /** Which dayKey to select on first render — e.g. today if it's in this
   * plan's week, otherwise the first day that actually has a session. */
  initialDayKey: string;
  editable: boolean;
}

export function PlannerWeekView({ dayTabs, sessionsByDay, initialDayKey, editable }: PlannerWeekViewProps) {
  const [selectedDay, setSelectedDay] = useState(initialDayKey);
  const daySessions = useMemo(() => sessionsByDay[selectedDay] ?? [], [sessionsByDay, selectedDay]);
  const selectedTab = dayTabs.find((d) => d.dayKey === selectedDay) ?? dayTabs[0];

  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">Your week</h2>
      </div>

      <div
        role="tablist"
        aria-label="Day of week"
        className="mt-3 flex gap-1.5 overflow-x-auto rounded-ctl bg-line p-1"
      >
        {dayTabs.map((tab) => {
          const isActive = tab.dayKey === selectedDay;
          const hasSessions = (sessionsByDay[tab.dayKey]?.length ?? 0) > 0;
          return (
            <button
              key={tab.dayKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedDay(tab.dayKey)}
              className={`relative flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-[calc(var(--radius-ctl)-4px)] px-3 text-[12.5px] font-extrabold motion-safe:transition-colors motion-safe:duration-200 ${
                isActive ? "bg-violet text-white" : "text-ink-2 hover:bg-line-hover"
              }`}
            >
              {tab.shortLabel}
              {hasSessions && !isActive && (
                <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm font-bold text-foreground">{selectedTab?.longLabel}</p>

      {daySessions.length === 0 ? (
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">No sessions planned for this day.</p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          {daySessions.map((s) => (
            <PlanSessionCard key={s.id} session={s} editable={editable} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanSessionCard({ session, editable }: { session: PlanSessionLite; editable: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [startAt, setStartAt] = useState(toLocalInputValue(session.startAt));
  const [endAt, setEndAt] = useState(toLocalInputValue(session.endAt));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tone = session.courseId ? courseTone(session.courseId) : null;
  const toneClasses = tone ? COURSE_TONE_CLASSES[tone] : null;

  const durationMinutes = Math.round(
    (new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 60000,
  );

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateStudySession(session.id, new Date(startAt).toISOString(), new Date(endAt).toISOString());
      if (!result.ok) {
        setError(result.error ?? "Couldn't save this change.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudySession(session.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't remove this session.");
      }
    });
  }

  if (editing) {
    return (
      <div className="rounded-ctl bg-line p-3">
        <p className="text-[12.5px] font-bold text-foreground">{session.assignmentTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="rounded-ctl border border-border-subtle bg-card px-2 py-1.5 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet"
          />
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="rounded-ctl border border-border-subtle bg-card px-2 py-1.5 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet"
          />
        </div>
        {error && (
          <p role="alert" className="mt-1.5 text-[11px] font-semibold text-coral-text">
            {error}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex min-h-11 items-center rounded-ctl bg-card px-3 py-1.5 text-[11px] font-bold text-ink-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="flex min-h-11 items-center rounded-ctl bg-violet px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 rounded-ctl bg-line p-3">
      {toneClasses && <span aria-hidden="true" className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toneClasses.solid}`} />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* Local-time formatting is expected to differ between SSR and hydration. */}
          <span className="font-display text-[13.5px] font-bold text-foreground" suppressHydrationWarning>
            {new Date(session.startAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            {" – "}
            {new Date(session.endAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>
          <p className="min-w-0 truncate text-[13px] font-bold text-foreground">{session.assignmentTitle}</p>
          <Tag tone="neutral">Assignment</Tag>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-ink-3">
          {session.courseName && <span>{session.courseName}</span>}
          <span>{durationMinutes} min</span>
        </div>
        {session.reason && <p className="mt-1 text-[11.5px] font-medium text-ink-2">{session.reason}</p>}
        {error && (
          <p role="alert" className="mt-1 text-[11px] font-semibold text-coral-text">
            {error}
          </p>
        )}
      </div>
      {editable && (
        <div className="flex shrink-0 items-start gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${session.assignmentTitle} session`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-ctl bg-card text-ink-2 hover:bg-line-hover"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            aria-label={`Remove ${session.assignmentTitle} session`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-ctl bg-card text-ink-2 hover:bg-coral-tint hover:text-coral-text disabled:opacity-60"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
