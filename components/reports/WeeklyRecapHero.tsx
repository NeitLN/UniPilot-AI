import Image from "next/image";

/** Headline copy is deterministic, based on real activity — never a
 * generic platitude unrelated to what actually happened (brief §7.3). */
function headline(completedMinutes: number, completedCount: number, streak: number): string {
  if (completedMinutes === 0 && completedCount === 0) return "A quiet week.";
  if (streak >= 5) return "You kept showing up.";
  if (completedCount > 0) return "Good progress this week.";
  return "You put in the time.";
}

/**
 * Half-circle gauge, as the concept draws it — a full ring reads as
 * "complete" at a glance even when the arc is only part-filled, and the
 * open bottom leaves room for the three stacked readings inside it.
 */
function GoalGauge({
  completedMinutes,
  goalMinutes,
  pct,
}: {
  completedMinutes: number;
  goalMinutes: number;
  pct: number;
}) {
  const width = 230;
  const stroke = 18;
  const radius = (width - stroke) / 2;

  const cy = radius + stroke / 2;
  const arcLength = Math.PI * radius;
  const path = `M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${cy}`;

  return (
    <div
      className="relative shrink-0"
      style={{ width, height: cy + stroke / 2 }}
      role="img"
      aria-label={`${completedMinutes} of your ${goalMinutes} minute weekly goal, ${pct}%`}
    >
      <svg viewBox={`0 0 ${width} ${cy + stroke / 2}`} className="absolute inset-0 h-full w-full">
        <path d={path} fill="none" strokeWidth={stroke} strokeLinecap="round" className="stroke-ink" />
        <path
          d={path}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength * (1 - pct / 100)}
          className="stroke-lime motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="font-display text-[34px] font-bold leading-none tabular-nums">{completedMinutes}</p>
        <p className="mt-1 text-[12.5px] font-semibold text-white/80 tabular-nums">/ {goalMinutes} min</p>
        <p className="mt-0.5 text-[11.5px] font-semibold text-white/70">Weekly goal</p>
      </div>
    </div>
  );
}

export function WeeklyRecapHero({
  completedMinutes,
  completedCount,
  streak,
  /** Goal minutes = weekly_availability_hours × 60 (brief §7.3) — null when
   * the viewer has no availability set, in which case the arc is hidden
   * entirely rather than dividing by zero or claiming a goal nobody set. */
  goalMinutes,
}: {
  completedMinutes: number;
  completedCount: number;
  streak: number;
  goalMinutes: number | null;
}) {
  const pct =
    goalMinutes && goalMinutes > 0 ? Math.min(100, Math.round((completedMinutes / goalMinutes) * 100)) : null;

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-card bg-violet p-5 text-white sm:p-6">
      <Image
        src="/mascots/pilo-weekly-report.png"
        alt=""
        width={175}
        height={180}
        className="h-[130px] w-auto shrink-0 object-contain sm:h-[175px]"
      />
      <div className="min-w-0 flex-1">
        {/* h2, not h1: the page already owns its <h1> ("Weekly report").
            This is a slogan about the week, not a second page title, and
            two h1s give a screen-reader user two competing titles. */}
        <h2 className="font-display text-3xl font-bold sm:text-[42px] sm:leading-[1.1]">
          {headline(completedMinutes, completedCount, streak)}
        </h2>
        {/* Raw minutes, not "5h 25m": the gauge beside this states the same
            figure in minutes against a minute goal, and the two disagreeing
            in unit made them read as two different numbers. */}
        <p className="mt-2 text-[13px] font-medium text-white/88">
          {completedMinutes} focused minute{completedMinutes === 1 ? "" : "s"} and {completedCount} assignment
          {completedCount === 1 ? "" : "s"} completed.
        </p>
        {streak > 0 && (
          <span className="mt-3 inline-flex items-center rounded-pill bg-lime px-3.5 py-1.5 text-[12.5px] font-extrabold text-ink">
            {streak} day streak
          </span>
        )}
      </div>

      {pct !== null && goalMinutes !== null && (
        <GoalGauge completedMinutes={completedMinutes} goalMinutes={goalMinutes} pct={pct} />
      )}
    </div>
  );
}
