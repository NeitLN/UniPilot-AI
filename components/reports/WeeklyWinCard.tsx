import Image from "next/image";
import type { WeeklyWin } from "@/lib/rules/insights";

/** `win` comes from the pure, unit-tested `deriveWeeklyWin` — renders
 * nothing when there's no real evidence for a win this week (brief §7.7). */
export function WeeklyWinCard({ win }: { win: WeeklyWin | null }) {
  if (!win) return null;

  return (
    <div className="flex items-center gap-3 rounded-card-sm bg-card p-4">
      <Image
        src="/mascots/pilo-weekly-report.png"
        alt=""
        width={102}
        height={107}
        className="h-[102px] w-auto shrink-0 object-contain"
      />
      <div className="min-w-0">
        <h2 className="font-display text-sm font-bold text-foreground">This week&rsquo;s win</h2>
        <p className="mt-0.5 text-[12.5px] font-semibold text-ink-2">{win.message}</p>
      </div>
    </div>
  );
}
