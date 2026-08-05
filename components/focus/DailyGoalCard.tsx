import { Flag } from "lucide-react";

export function DailyGoalCard({ completed, goal }: { completed: number; goal: number }) {
  // Clamp the *visual* bar at 100%, but the number itself always shows the
  // real count even past goal — never hides that the viewer over-delivered.
  const pct = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;
  const metGoal = goal > 0 && completed >= goal;

  return (
    <div className="flex items-center gap-4 rounded-card bg-violet p-5 text-white">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-sm font-bold">Today&rsquo;s goal</h2>
        {/* Lime on the two counts, white on the connecting words — the pair
            of numbers is the reading, the grammar around them isn't. */}
        <p className="mt-2 font-display text-4xl font-bold">
          <span className="text-lime">{completed}</span>
          <span className="mx-1.5 text-lg font-semibold">of</span>
          <span className="text-lime">{goal}</span>
          <span className="ml-1.5 text-lg font-semibold">cycles</span>
        </p>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Today's focus goal progress"
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink/40"
        >
          <div
            className="h-full rounded-full bg-lime motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2.5 text-[11.5px] font-semibold text-white/80">
          {goal <= 0
            ? "Set a daily goal in Settings to track this."
            : metGoal
              ? "Goal reached — nice work today."
              : completed === 0
                ? "Start your first cycle today."
                : "Keep going! You're on track to hit your goal."}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15"
      >
        <Flag className="h-8 w-8 text-lime" fill="currentColor" />
      </span>
    </div>
  );
}
