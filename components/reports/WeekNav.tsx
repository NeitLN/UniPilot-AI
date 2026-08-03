"use client";

import { usePathname, useRouter } from "next/navigation";

export function WeekNav({
  weekLabel,
  previousWeekKey,
  nextWeekKey,
  isCurrentWeek,
}: {
  weekLabel: string;
  previousWeekKey: string;
  nextWeekKey: string | null;
  isCurrentWeek: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <p className="text-sm font-semibold text-ink-2">{weekLabel}</p>
      <div className="ml-auto flex gap-1.5">
        <button
          type="button"
          onClick={() => router.push(`${pathname}?week=${previousWeekKey}`)}
          className="flex min-h-11 items-center rounded-ctl bg-line px-3.5 text-xs font-bold text-ink-2 hover:bg-line-hover"
        >
          ‹ Previous week
        </button>
        {!isCurrentWeek && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="flex min-h-11 items-center rounded-ctl bg-violet px-3.5 text-xs font-bold text-white hover:bg-violet-deep"
          >
            This week
          </button>
        )}
        {nextWeekKey && (
          <button
            type="button"
            onClick={() => router.push(`${pathname}?week=${nextWeekKey}`)}
            className="flex min-h-11 items-center rounded-ctl bg-line px-3.5 text-xs font-bold text-ink-2 hover:bg-line-hover"
          >
            Next week ›
          </button>
        )}
      </div>
    </div>
  );
}
