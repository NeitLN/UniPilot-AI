import Image from "next/image";
import type { WeeklyWin } from "@/lib/rules/insights";

/** `win` comes from the pure, unit-tested `deriveWeeklyWin` — renders
 * nothing when there's no real evidence for a win this week (brief §7.7). */
export function WeeklyWinCard({ win }: { win: WeeklyWin | null }) {
  if (!win) return null;

  return (
    <div className="flex items-center gap-4 rounded-card bg-card p-5">
      <Image
        src="/mascots/pilo-weekly-report.png"
        alt=""
        width={110}
        height={115}
        className="h-[110px] w-auto shrink-0 object-contain"
      />
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-foreground">This week&rsquo;s win</h2>
        <p className="mt-1 text-[13px] font-semibold text-ink-2">{win.message}</p>
      </div>
    </div>
  );
}
