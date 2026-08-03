"use client";

import { usePathname, useRouter } from "next/navigation";

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

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => router.push(`${pathname}?week=${previousWeekKey}`)}
        className="flex min-h-11 items-center rounded-ctl bg-line px-3.5 text-xs font-bold text-ink-2 hover:bg-line-hover"
      >
        ‹ Previous week
      </button>
      <button
        type="button"
        aria-current={isCurrentWeek ? "true" : undefined}
        onClick={() => !isCurrentWeek && router.push(pathname)}
        className={`flex min-h-11 items-center rounded-ctl px-3.5 text-xs font-bold ${
          isCurrentWeek ? "bg-violet text-white cursor-default" : "bg-line text-ink-2 hover:bg-line-hover"
        }`}
      >
        This week
      </button>
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
  );
}
