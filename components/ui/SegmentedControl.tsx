"use client";

/**
 * Pill-group tab control (Schedule's Day/Week/Month, Assignments' quick
 * filters, GPA's scenario picker, etc.). Purely controlled — a page that
 * wants URL-driven state builds `value`/`onChange` from `useSearchParams`
 * itself (see `AssignmentCommandBar`); this primitive has no router
 * awareness of its own so it isn't tied to any single URL param shape.
 */
export interface SegmentedControlOption {
  value: string;
  label: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the tablist — required since visual labels alone
   * don't say what's being filtered (e.g. "View" vs "Quick filters"). */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex min-w-0 gap-1 overflow-x-auto rounded-ctl bg-line p-1 ${className ?? ""}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={`flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-[calc(var(--radius-ctl)-4px)] px-3 text-[12.5px] font-extrabold motion-safe:transition-colors motion-safe:duration-200 ${
              isActive ? "bg-violet text-white" : "text-ink-2 hover:bg-line-hover"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
