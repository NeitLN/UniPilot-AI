import {
  AVAILABILITY_WINDOW_END_MIN,
  AVAILABILITY_WINDOW_START_MIN,
  freeAvailabilityBands,
  type BusyRange,
} from "@/lib/rules/plan-presentation";
import type { DayTab } from "@/lib/rules/plan-presentation";

const HOUR_MARKS = [8, 12, 16, 20];
const WINDOW_MINUTES = AVAILABILITY_WINDOW_END_MIN - AVAILABILITY_WINDOW_START_MIN;

function pct(minute: number): number {
  return ((minute - AVAILABILITY_WINDOW_START_MIN) / WINDOW_MINUTES) * 100;
}

/** Free-time-only bands, split morning/afternoon (see
 * lib/rules/plan-presentation.ts freeAvailabilityBands doc comment for why
 * a third "low energy" tint was deliberately dropped — there's no real
 * signal in this app's data to support that claim). */
export function AvailabilityBands({
  days,
  busyRanges,
  timeZone,
}: {
  days: DayTab[];
  busyRanges: BusyRange[];
  timeZone: string;
}) {
  return (
    <div className="rounded-card-sm bg-card p-4">
      <h2 className="font-display text-sm font-bold text-foreground">Availability</h2>
      <p className="mt-0.5 text-[11px] font-semibold text-ink-3">Free time windows this week</p>

      <div className="mt-3 flex text-[10px] font-bold text-ink-3">
        <span className="w-12 shrink-0" />
        <div className="relative flex-1">
          {HOUR_MARKS.map((h) => (
            <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h * 60)}%` }}>
              {h}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {days.map((day) => {
          const bands = freeAvailabilityBands(day.dayKey, busyRanges, timeZone);
          return (
            <div key={day.dayKey} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[11px] font-bold text-ink-2">{day.shortLabel}</span>
              <div className="relative h-3 flex-1 rounded-full bg-line">
                {bands.map((b, i) => (
                  <div
                    key={i}
                    aria-hidden="true"
                    className={`absolute inset-y-0 rounded-full ${b.period === "morning" ? "bg-mint" : "bg-tangerine"}`}
                    style={{ left: `${pct(b.startMinute)}%`, width: `${pct(b.endMinute) - pct(b.startMinute)}%` }}
                  />
                ))}
                <span className="sr-only">
                  {bands.length === 0
                    ? `${day.longLabel}: fully booked between 8am and 8pm.`
                    : `${day.longLabel} free: ${bands
                        .map((b) => `${minuteLabel(b.startMinute)}–${minuteLabel(b.endMinute)}`)
                        .join(", ")}.`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10.5px] font-bold text-ink-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-mint" /> Free morning
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-tangerine" /> Free afternoon/evening
        </span>
      </div>
    </div>
  );
}

function minuteLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}
