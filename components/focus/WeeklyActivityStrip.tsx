import { activityTone, type ActivityTone, type DayActivity } from "@/lib/rules/focus";

const TONE_CLASSES: Record<ActivityTone, string> = {
  great: "bg-mint",
  good: "bg-tangerine",
  heavy: "bg-coral",
  light: "bg-violet-soft",
  rest: "border border-dashed border-white/25 bg-transparent",
};

const TONE_LABEL: Record<ActivityTone, string> = {
  great: "Great",
  good: "Good",
  heavy: "Heavy",
  light: "Light",
  rest: "Rest",
};

/** Each day's tone is relative to the viewer's own daily goal (see
 * lib/rules/focus.ts activityTone) — never an absolute judgment call. */
export function WeeklyActivityStrip({ days, goalCycles }: { days: DayActivity[]; goalCycles: number }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const tone = activityTone(d.completedCycles, goalCycles);
          const label = new Date(`${d.dayKey}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
          return (
            <div key={d.dayKey} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-dusk-text">{label}</span>
              <span
                aria-label={`${label}: ${TONE_LABEL[tone]}${d.completedCycles > 0 ? `, ${d.completedCycles} cycle${d.completedCycles === 1 ? "" : "s"}` : ""}`}
                className={`h-6 w-full rounded-[6px] ${TONE_CLASSES[tone]}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2.5 text-[10px] font-bold text-dusk-text">
        {(Object.keys(TONE_LABEL) as ActivityTone[]).map((tone) => (
          <span key={tone} className="flex items-center gap-1">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[3px] ${TONE_CLASSES[tone]}`} />
            {TONE_LABEL[tone]}
          </span>
        ))}
      </div>
    </div>
  );
}
