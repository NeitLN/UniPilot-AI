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

/** How many squares a day can draw before it runs out of column width. Days
 * past this still report their true count to assistive tech and in the
 * tooltip — only the drawing saturates. */
const MAX_SQUARES = 4;

/** Each day's tone is relative to the viewer's own daily goal (see
 * lib/rules/focus.ts activityTone) — never an absolute judgment call.
 *
 * One square per completed cycle, rather than the single full-width bar this
 * used to draw: the bar could only encode the tone, so a 1-cycle day and a
 * 4-cycle day at the same tone looked identical. A rest day still draws one
 * dashed placeholder so the week keeps its seven columns. */
export function WeeklyActivityStrip({
  days,
  goalCycles,
}: {
  days: DayActivity[];
  goalCycles: number;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const tone = activityTone(d.completedCycles, goalCycles);
          const label = new Date(`${d.dayKey}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
          });
          const squares = Math.min(Math.max(d.completedCycles, 1), MAX_SQUARES);
          const cycleText =
            d.completedCycles > 0
              ? `, ${d.completedCycles} cycle${d.completedCycles === 1 ? "" : "s"}`
              : "";
          return (
            <div key={d.dayKey} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-dusk-text">{label}</span>
              <span
                role="img"
                aria-label={`${label}: ${TONE_LABEL[tone]}${cycleText}`}
                title={`${label} — ${TONE_LABEL[tone]}${cycleText}`}
                // Two per row, so four cycles read as a compact 2x2 block.
                // In one flat row the seven days ran together into a single
                // undifferentiated strip of squares.
                className="mx-auto grid w-fit grid-cols-2 gap-[3px]"
              >
                {Array.from({ length: squares }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-[3px] ${TONE_CLASSES[tone]}`}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2.5 text-[10px] font-bold text-dusk-text">
        {(Object.keys(TONE_LABEL) as ActivityTone[]).map((tone) => (
          <span key={tone} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-[3px] ${TONE_CLASSES[tone]}`}
            />
            {TONE_LABEL[tone]}
          </span>
        ))}
      </div>
    </div>
  );
}
