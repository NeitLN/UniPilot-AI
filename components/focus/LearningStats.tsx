"use client";

import { useState } from "react";
import {
  chartAxisTicks,
  formatMinutes,
  type DayActivity,
  type WeekMinutes,
} from "@/lib/rules/focus";

const BAR_MAX_HEIGHT = 132;
const AXIS_WIDTH = 34;

export interface LearningStatsProps {
  /** Per-day totals for the last 7 days — the same series the weekly
   * activity strip uses, so the two can never disagree. */
  dailySeries: DayActivity[];
  weeklySeries: WeekMinutes[];
}

type Range = "week" | "weeks8";

function weekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split("-").map(Number);
  return new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dayLabel(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

/** §5 "Thống kê học tập theo thời gian" — when the time went in. The
 * per-course breakdown lives in its own card (CourseTimeCard); this one is
 * the chart alone, as the concept draws it. */
export function LearningStats({
  dailySeries,
  weeklySeries,
}: LearningStatsProps) {
  // The concept labels this chart "This week"; that label is a real range
  // switch rather than a caption, so the eight-week view the page already
  // computes stays reachable instead of being dropped for the daily one.
  const [range, setRange] = useState<Range>("week");

  const points =
    range === "week"
      ? dailySeries.map((d) => ({
          key: d.dayKey,
          label: dayLabel(d.dayKey),
          minutes: d.minutes,
        }))
      : weeklySeries.map((w) => ({
          key: w.weekStart,
          label: weekLabel(w.weekStart),
          minutes: w.minutes,
        }));

  const ticks = chartAxisTicks(Math.max(...points.map((p) => p.minutes), 0));
  const axisMax = ticks[ticks.length - 1];
  // UX-01: with no sessions logged, the chart still drew a labelled axis,
  // gridlines and seven 2px stubs — which reads as "this failed to load"
  // rather than "you have not done this yet". GpaTrendChart and
  // PlanAdherenceCard already branch like this; this one did not.
  const hasData = points.some((p) => p.minutes > 0);

  return (
    <div className="flex min-w-0 flex-col rounded-card bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          Learning rhythm
        </h2>
        <button
          type="button"
          onClick={() => setRange((r) => (r === "week" ? "weeks8" : "week"))}
          // See FocusHistoryCard: min-h-6 clears the 24px target-size floor
          // that type-only styling left this button 1px short of.
          className="-mx-1 flex min-h-6 shrink-0 items-center px-1 text-[12.5px] font-bold text-violet-text hover:underline"
        >
          {range === "week" ? "This week" : "Last 8 weeks"}
        </button>
      </div>

      {!hasData ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-10 text-center">
          <p className="text-[13px] font-bold text-foreground">
            No focus time yet
          </p>
          <p className="max-w-[34ch] text-[12px] font-semibold text-ink-3">
            {range === "week"
              ? "Run a focus session and this week's rhythm shows up here."
              : "Nothing logged in the last eight weeks."}
          </p>
        </div>
      ) : (
        <>
          {/* Gridlines with round tick values, so a bar can be read as a number
          instead of only against its neighbours. */}
          <div className="mt-5 flex" style={{ height: BAR_MAX_HEIGHT }}>
            <div
              className="relative shrink-0 text-[9.5px] font-bold text-ink-3 tabular-nums"
              style={{ width: AXIS_WIDTH }}
            >
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute right-2 translate-y-1/2"
                  style={{ bottom: `${(t / axisMax) * 100}%` }}
                >
                  {t}m
                </span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              {ticks.map((t) => (
                <span
                  key={t}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-border-subtle-2"
                  style={{ bottom: `${(t / axisMax) * 100}%` }}
                />
              ))}
              {/* Each bar is centred in its own share of the width rather than
              filling it, so the columns read as separate readings. */}
              <div className="absolute inset-0 flex items-end gap-1.5">
                {points.map((p) => (
                  <div
                    key={p.key}
                    className="flex min-w-0 flex-1 justify-center self-stretch"
                  >
                    <div
                      title={`${p.label}: ${formatMinutes(Math.round(p.minutes))}`}
                      className="mt-auto w-full max-w-[26px] rounded-t-[4px] bg-mint"
                      style={{
                        height:
                          p.minutes > 0
                            ? `${Math.max(2, (p.minutes / axisMax) * 100)}%`
                            : 2,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="mt-2 flex gap-1.5"
            style={{ paddingLeft: AXIS_WIDTH }}
          >
            {points.map((p) => (
              <span
                key={p.key}
                className="min-w-0 flex-1 truncate text-center text-[9.5px] font-bold text-ink-3"
              >
                {p.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
