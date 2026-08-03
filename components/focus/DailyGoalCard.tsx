import { Flag } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";

export function DailyGoalCard({ completed, goal }: { completed: number; goal: number }) {
  // Clamp the *visual* bar at 100%, but the number itself always shows the
  // real count even past goal — never hides that the viewer over-delivered.
  const pct = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;
  const metGoal = goal > 0 && completed >= goal;

  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold">Today&rsquo;s goal</h2>
        <IconChip icon={<Flag className="h-4 w-4" aria-hidden="true" fill="currentColor" />} tone="ink" size="sm" />
      </div>
      <p className="mt-2 font-display text-4xl font-bold">
        {completed} <span className="text-lg font-semibold text-white/70">of {goal} cycles</span>
      </p>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Today's focus goal progress"
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/20"
      >
        <div
          className="h-full rounded-full bg-lime motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11.5px] font-semibold text-white/80">
        {goal <= 0
          ? "Set a daily goal in Settings to track this."
          : metGoal
            ? "Goal reached — nice work today."
            : completed === 0
              ? "Start your first cycle today."
              : "Keep going! You're on track to hit your goal."}
      </p>
    </div>
  );
}
