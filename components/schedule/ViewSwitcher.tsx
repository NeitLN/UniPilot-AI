"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  parseDateParam,
  shiftDate,
  toDateParam,
  type ScheduleView,
} from "@/lib/calendar/view";

const VIEWS: { value: ScheduleView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export function ViewSwitcher({
  view,
  date,
}: {
  view: ScheduleView;
  date: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(nextView: ScheduleView, nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    params.set("date", nextDate);
    params.delete("error");
    params.delete("connected");
    router.push(`${pathname}?${params.toString()}`);
  }

  const anchor = parseDateParam(date);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex gap-1 rounded-ctl bg-line p-1">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => navigate(v.value, date)}
            aria-pressed={view === v.value}
            className={`rounded-[12px] px-3 py-1.5 text-xs font-bold transition-colors ${
              view === v.value ? "bg-white text-ink" : "text-ink-3"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => navigate(view, toDateParam(shiftDate(view, anchor, -1)))}
          className="rounded-ctl bg-line px-2.5 py-1.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => navigate(view, toDateParam(new Date()))}
          className="rounded-ctl bg-line px-3 py-1.5 text-xs font-bold text-ink-2 hover:bg-[#E6E2F2]"
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => navigate(view, toDateParam(shiftDate(view, anchor, 1)))}
          className="rounded-ctl bg-line px-2.5 py-1.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
        >
          ›
        </button>
      </div>

      {/* Formatted in the runtime's local timezone — expected to differ
          between SSR and hydration, not a real mismatch. */}
      <p className="text-sm font-bold text-ink" suppressHydrationWarning>
        {anchor.toLocaleDateString(undefined, {
          month: "long",
          day: view === "month" ? undefined : "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
