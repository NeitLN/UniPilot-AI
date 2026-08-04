"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, CalendarDays, CalendarRange, CheckCircle2, SlidersHorizontal } from "lucide-react";
import type { CourseOption } from "./AssignmentForm";

const SEGMENTS = [
  { key: "all", label: "All tasks", icon: CalendarDays },
  { key: "today", label: "Today", icon: CalendarDays },
  { key: "week", label: "This week", icon: CalendarRange },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

function activeSegment(status: string | null, when: string | null): SegmentKey | null {
  if (status === "done") return "completed";
  if (when === "today") return "today";
  if (when === "week") return "week";
  if (!status && !when) return "all";
  return null;
}

/**
 * Search + segmented quick filters + an advanced panel (Course/Status/
 * Archived), all driven by URL search params so refresh/share never loses
 * filter state (brief §6.2). Replaces the old flat AssignmentFilters —
 * `q`/`course`/`status` keep working exactly as before; `when` (today/week)
 * is new and only ever applied client-side against the viewer's own
 * timezone (see app/(app)/assignments/page.tsx).
 */
export function AssignmentCommandBar({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get("status");
  const when = searchParams.get("when");
  const course = searchParams.get("course");

  // F-04: local, debounced so every keystroke doesn't push a navigation —
  // only discrete picks (segment/course/status) are instant.
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(course) || (status !== null && status !== "done"),
  );

  function updateMany(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateMany({ q: value || null }), 350);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function selectSegment(key: SegmentKey) {
    if (key === "all") updateMany({ status: null, when: null });
    else if (key === "today") updateMany({ when: "today", status: null });
    else if (key === "week") updateMany({ when: "week", status: null });
    else if (key === "completed") updateMany({ status: "done", when: null });
  }

  const current = activeSegment(status, when);

  return (
    <div className="flex flex-col gap-3 rounded-card-sm bg-card p-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search assignments"
            placeholder="Search assignments…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="min-h-11 w-full rounded-ctl border border-border-subtle bg-canvas pl-10 pr-4 text-sm font-semibold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented control — scrolls horizontally on narrow screens
              inside its own container, never widening the page (brief §6.2). */}
          <div
            role="tablist"
            aria-label="Quick filters"
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-ctl bg-canvas p-1 lg:flex-none"
          >
            {SEGMENTS.map((s) => {
              const isActive = current === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectSegment(s.key)}
                  className={`flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius-ctl)-4px)] border px-3 text-[12.5px] font-extrabold motion-safe:transition-colors motion-safe:duration-200 ${
                    isActive
                      ? "border-violet bg-violet-tint text-violet-text"
                      : "border-transparent text-ink-2 hover:bg-line"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-ctl border border-border-cb bg-card px-3.5 text-xs font-bold text-ink-2 hover:bg-line"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Filter
          </button>
        </div>
      </div>

      {advancedOpen && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <select
            aria-label="Filter by course"
            value={course ?? ""}
            onChange={(e) => updateMany({ course: e.target.value || null })}
            className="min-h-11 min-w-0 max-w-full flex-1 truncate rounded-ctl border border-border-subtle bg-canvas px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet sm:max-w-[45%]"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} — ${c.name}` : c.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={status ?? ""}
            onChange={(e) => updateMany({ status: e.target.value || null, when: null })}
            className="min-h-11 min-w-0 max-w-full flex-1 truncate rounded-ctl border border-border-subtle bg-canvas px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet sm:max-w-[45%]"
          >
            <option value="">All statuses</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}
    </div>
  );
}
