import { formatMinutes } from "@/lib/rules/focus";

export interface FocusStatsData {
  completedCycles: number;
  partialSessions: number;
  completedMinutes: number;
  partialMinutes: number;
  streak: number;
  byAssignment: { id: string; title: string; minutes: number }[];
  byCourse: { name: string; minutes: number }[];
}

export function FocusStats({ data }: { data: FocusStatsData }) {
  const hasAnySession = data.completedCycles > 0 || data.partialSessions > 0;

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">This week</h2>

      <div className="mt-3 grid grid-cols-3 gap-3 border-b border-line pb-4">
        <Stat label="Streak" value={`${data.streak}d`} />
        <Stat label="Completed" value={String(data.completedCycles)} />
        <Stat label="Minutes" value={String(data.completedMinutes)} />
      </div>

      {data.partialSessions > 0 && (
        <p className="mt-3 text-[11.5px] font-semibold text-ink-3">
          Plus {data.partialSessions} partial session
          {data.partialSessions === 1 ? "" : "s"} (
          {formatMinutes(data.partialMinutes)}) — not counted toward the streak.
        </p>
      )}

      {!hasAnySession && (
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          No focus sessions yet this week.
        </p>
      )}

      {data.byCourse.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-ink-2">By course</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {data.byCourse.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-3 text-[12.5px] font-semibold text-foreground"
              >
                <span className="min-w-0 truncate">{c.name}</span>
                <span className="shrink-0 text-ink-3">{formatMinutes(c.minutes)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.byAssignment.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-ink-2">By assignment</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {data.byAssignment.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 text-[12.5px] font-semibold text-foreground"
              >
                <span className="min-w-0 truncate">{a.title}</span>
                <span className="shrink-0 text-ink-3">{formatMinutes(a.minutes)}</span>
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
      <p className="font-display text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-3">
        {label}
      </p>
    </div>
  );
}
