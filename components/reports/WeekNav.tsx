"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function WeekNav({
  previousWeekKey,
  nextWeekKey,
  isCurrentWeek,
}: {
  previousWeekKey: string;
  nextWeekKey: string | null;
  isCurrentWeek: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // White bordered pills against one filled violet "This week", per the
  // concept — all three used to share the same grey fill, so the week you
  // were actually looking at wasn't distinguishable from the way out of it.
  const quiet =
    "flex min-h-11 items-center gap-1.5 rounded-ctl border border-border-cb bg-card px-4 text-[12.5px] font-bold text-ink-2 hover:bg-line";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => router.push(`${pathname}?week=${previousWeekKey}`)}
        className={quiet}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous week
      </button>
      <button
        type="button"
        aria-current={isCurrentWeek ? "true" : undefined}
        onClick={() => !isCurrentWeek && router.push(pathname)}
        className={`flex min-h-11 items-center rounded-ctl px-5 text-[12.5px] font-bold ${
          isCurrentWeek ? "cursor-default bg-violet text-white" : `${quiet}`
        }`}
      >
        This week
      </button>
      {nextWeekKey && (
        <button
          type="button"
          onClick={() => router.push(`${pathname}?week=${nextWeekKey}`)}
          className={quiet}
        >
          Next week
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
