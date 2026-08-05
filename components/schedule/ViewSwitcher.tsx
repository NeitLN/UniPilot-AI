"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatViewRangeLabel,
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

export function ViewSwitcher({ view, date }: { view: ScheduleView; date: string }) {
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
            className={`flex min-h-11 items-center rounded-[12px] px-3.5 py-1.5 text-xs font-bold transition-colors ${
              view === v.value ? "bg-violet text-white" : "text-ink-2 hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Round chevrons flanking a Today pill, per the concept — the old
          "‹"/"›" text glyphs rendered at whatever weight the font gave them
          and read as punctuation rather than controls. */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => navigate(view, toDateParam(shiftDate(view, anchor, -1)))}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-2 hover:bg-line"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => navigate(view, toDateParam(new Date()))}
          className="flex min-h-11 items-center rounded-ctl border border-border-cb bg-card px-4 py-1.5 text-xs font-bold text-ink-2 hover:bg-line"
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => navigate(view, toDateParam(shiftDate(view, anchor, 1)))}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-2 hover:bg-line"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Formatted in the runtime's local timezone — expected to differ
          between SSR and hydration, not a real mismatch. */}
      <p className="font-display text-base font-bold text-foreground" suppressHydrationWarning>
        {formatViewRangeLabel(view, anchor)}
      </p>
    </div>
  );
}
