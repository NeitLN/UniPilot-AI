"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CourseOption } from "./AssignmentForm";

export function AssignmentFilters({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // F-04: local, debounced so every keystroke doesn't push a navigation —
  // only course/status changes are instant since those are discrete picks.
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Any filter change invalidates whatever page you were on.
    params.delete("page");
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update("q", value), 350);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {/* QA-02 (docs/PRODUCT_REVIEW.md): a <select> takes its intrinsic
          width from its longest option (301px for the course dropdown) and
          won't shrink, so a plain `flex-1` search input got squeezed down
          to ~36-49px below `lg` while the two selects kept their full
          width. `basis-full` forces the search onto its own row below
          `lg`; only at `lg` and up (desktop, where the selects' combined
          width comfortably shares a row with a usable search box) does it
          rejoin them as `flex-1`. */}
      <input
        type="search"
        aria-label="Search assignments"
        placeholder="Search by title…"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="min-w-0 basis-full rounded-ctl border border-border-subtle bg-card px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet lg:basis-0 lg:flex-1"
      />

      <select
        aria-label="Filter by course"
        defaultValue={searchParams.get("course") ?? ""}
        onChange={(e) => update("course", e.target.value)}
        className="min-h-11 min-w-0 max-w-[45%] truncate rounded-ctl border border-border-subtle bg-card px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet lg:max-w-none"
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
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="min-h-11 min-w-0 max-w-[45%] truncate rounded-ctl border border-border-subtle bg-card px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet lg:max-w-none"
      >
        <option value="">All statuses</option>
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}
