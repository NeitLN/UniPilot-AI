import { Boxes, Clock3, Flame } from "lucide-react";
import { formatMinutes, type DayActivity } from "@/lib/rules/focus";
import { IconChip } from "@/components/ui/IconChip";
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

const TOP_ASSIGNMENTS = 3;

export function FocusStats({ data }: { data: FocusStatsData }) {
  const hasAnySession = data.completedCycles > 0 || data.partialSessions > 0;

  return (
    <div className="rounded-card bg-ink p-5 text-white">
      <h2 className="font-display text-lg font-bold">This week</h2>

      {/* Each figure now carries its own icon and a caption saying what it
          measures. The old trio was three bare numbers under one-word labels
          ("Streak / Completed / Minutes"), which left "Completed" ambiguous
          between cycles and sessions. */}
      <div className="mt-3 grid grid-cols-3 border-b border-dusk-border pb-4">
        <Stat
          icon={<Boxes aria-hidden="true" />}
          tone="mint"
          value={String(data.completedCycles)}
          unit={data.completedCycles === 1 ? "cycle" : "cycles"}
          caption="Sessions completed"
        />
        <Stat
          icon={<Clock3 aria-hidden="true" />}
          tone="mint"
          value={String(data.completedMinutes)}
          unit="min"
          caption="Total focus time"
          divided
        />
        <Stat
          icon={<Flame aria-hidden="true" />}
          tone="tangerine"
          value={String(data.streak)}
          unit="day streak"
          caption={data.streak > 0 ? "Keep it going!" : "Start one today"}
          divided
        />
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
          {/* Top few only. Unbounded, a busy week made this card twice the
              height of the timer beside it, and the grid stretched the timer
              to match — leaving a large empty band under its dial. The rest
              of the week's time is still reachable in Learning rhythm's
              per-course table. */}
          <ul className="mt-1.5 flex flex-col gap-1">
            {data.byAssignment.slice(0, TOP_ASSIGNMENTS).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-[12.5px] font-semibold">
                <span className="min-w-0 truncate">{a.title}</span>
                <span className="shrink-0 text-dusk-text">{formatMinutes(a.minutes)}</span>
              </li>
            ))}
          </ul>
          {data.byAssignment.length > TOP_ASSIGNMENTS && (
            <p className="mt-1.5 text-[11px] font-semibold text-dusk-text">
              +{data.byAssignment.length - TOP_ASSIGNMENTS} more this week
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  tone,
  value,
  unit,
  caption,
  divided = false,
}: {
  icon: React.ReactNode;
  tone: "mint" | "tangerine";
  value: string;
  unit: string;
  caption: string;
  /** Hairline rule on the leading edge — separates the trio without boxing
   * each figure in its own card. */
  divided?: boolean;
}) {
  return (
    <div className={divided ? "border-l border-dusk-border pl-3" : "pr-3"}>
      <IconChip icon={icon} tone={tone} size="sm" />
      <p className="mt-2 font-display text-2xl font-bold leading-none tabular-nums">
        {value}
        <span className="ml-1 text-[12.5px] font-bold">{unit}</span>
      </p>
      <p className="mt-1.5 text-[11px] font-semibold text-dusk-text">{caption}</p>
    </div>
  );
}
