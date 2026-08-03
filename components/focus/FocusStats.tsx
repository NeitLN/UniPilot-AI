import { formatMinutes, type DayActivity } from "@/lib/rules/focus";
import { WeeklyActivityStrip } from "./WeeklyActivityStrip";

export interface FocusStatsData {
  completedCycles: number;
  partialSessions: number;
  completedMinutes: number;
  partialMinutes: number;
  /** FR-22: minutes logged by hand rather than via the Pomodoro timer. */
  manualMinutes: number;
  streak: number;
  byAssignment: { id: string; title: string; minutes: number }[];
  dailyActivity: DayActivity[];
  dailyGoalCycles: number;
}

export function FocusStats({ data }: { data: FocusStatsData }) {
  const hasAnySession = data.completedCycles > 0 || data.partialSessions > 0;

  return (
    <div className="rounded-card bg-ink p-5 text-white">
      <h2 className="font-display text-lg font-bold">This week</h2>

      <div className="mt-3 grid grid-cols-3 gap-3 border-b border-dusk-border pb-4">
        <Stat label="Streak" value={`${data.streak}d`} />
        <Stat label="Completed" value={String(data.completedCycles)} />
        <Stat label="Minutes" value={String(data.completedMinutes)} />
      </div>

      {data.partialSessions > 0 && (
        <p className="mt-3 text-[11.5px] font-semibold text-dusk-text">
          Plus {data.partialSessions} partial session
          {data.partialSessions === 1 ? "" : "s"} (
          {formatMinutes(data.partialMinutes)}) — not counted toward the streak.
        </p>
      )}

      {data.manualMinutes > 0 && (
        <p className="mt-1.5 text-[11.5px] font-semibold text-dusk-text">
          Includes {formatMinutes(data.manualMinutes)} logged manually.
        </p>
      )}

      {!hasAnySession && (
        <p className="mt-3 text-[12.5px] font-semibold text-dusk-text">No focus sessions yet this week.</p>
      )}

      <div className="mt-4">
        <WeeklyActivityStrip days={data.dailyActivity} goalCycles={data.dailyGoalCycles} />
      </div>

      {data.byAssignment.length > 0 && (
        <div className="mt-4 border-t border-dusk-border pt-3">
          <p className="text-xs font-bold text-dusk-text">By assignment</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {data.byAssignment.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-[12.5px] font-semibold">
                <span className="min-w-0 truncate">{a.title}</span>
                <span className="shrink-0 text-dusk-text">{formatMinutes(a.minutes)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-dusk-text">{label}</p>
    </div>
  );
}
