import { computePlanProgress } from "@/lib/rules/plan";
import { Tag } from "@/components/ui/Tag";

export interface ActivePlanSessionData {
  id: string;
  assignmentTitle: string;
  startAt: string;
  endAt: string;
}

/** UX4-02 / QA4-03 (docs/PRODUCT_REVIEW_4.md) — a plan whose every session
 * was days in the past used to render identically to one with sessions
 * still ahead: same mint "Active" badge either way. `now` is an optional
 * override (server render defaults it) purely so this stays testable the
 * same way the rest of lib/rules is. */
export function ActivePlanSummary({
  sessions,
  confirmedAt,
  now = new Date(),
}: {
  sessions: ActivePlanSessionData[];
  confirmedAt: string | null;
  now?: Date;
}) {
  const progress = computePlanProgress(sessions, now);
  const ended = progress.lifecycle === "ended";

  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">
          {ended ? "Past plan" : "Active plan"}
        </h2>
        <Tag tone={ended ? "neutral" : "mint"}>{ended ? "Ended" : "Active"}</Tag>
      </div>

      {confirmedAt && (
        <p className="mt-1 text-[11.5px] font-semibold text-ink-3">
          Confirmed{" "}
          {new Date(confirmedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          {progress.totalCount > 0 &&
            ` · ${progress.pastCount} of ${progress.totalCount} sessions have passed`}
        </p>
      )}

      {ended && (
        <p className="mt-2 text-[12.5px] font-semibold text-ink-2">
          This plan has ended. Use &ldquo;Generate new draft&rdquo; above to plan this week.
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          No sessions on this plan.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {sessions.map((s) => {
            const isPast = new Date(s.startAt).getTime() < now.getTime();
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-ctl bg-line px-3 py-2 text-[12.5px] font-semibold text-foreground"
              >
                <span aria-hidden="true" className="shrink-0 text-ink-3">
                  {isPast ? "○" : "●"}
                </span>
                <span className="w-[130px] shrink-0 text-ink-3">
                  {new Date(s.startAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {/* De-emphasized via the same text-ink-3 token already used
                    for secondary text elsewhere, not opacity — a flat
                    opacity on this row measured at 3.97:1 in dark mode,
                    under the 4.5:1 AA floor QA4-02 exists to enforce
                    (docs/PRODUCT_REVIEW_4.md). text-ink-3 on bg-line is an
                    already-proven pairing (used one column over on this
                    same row) that measures 4.52:1. */}
                <span className={`min-w-0 flex-1 truncate ${isPast ? "text-ink-3" : ""}`}>
                  {s.assignmentTitle}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
