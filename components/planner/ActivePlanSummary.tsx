export interface ActivePlanSessionData {
  id: string;
  assignmentTitle: string;
  startAt: string;
  endAt: string;
}

export function ActivePlanSummary({
  sessions,
  confirmedAt,
}: {
  sessions: ActivePlanSessionData[];
  confirmedAt: string | null;
}) {
  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Active plan</h2>
        <span className="rounded-pill bg-mint-tint px-2.5 py-1 text-[10.5px] font-extrabold text-mint-text">
          Active
        </span>
      </div>

      {confirmedAt && (
        <p className="mt-1 text-[11.5px] font-semibold text-ink-3">
          Confirmed{" "}
          {new Date(confirmedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          No sessions on this plan.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-ctl bg-line px-3 py-2 text-[12.5px] font-semibold text-foreground"
            >
              <span className="w-[130px] shrink-0 text-ink-3">
                {new Date(s.startAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="min-w-0 flex-1 truncate">{s.assignmentTitle}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
