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
      <input
        type="search"
        aria-label="Search assignments"
        placeholder="Search by title…"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="min-w-0 flex-1 rounded-ctl border border-border-subtle bg-card px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
      />

      <select
        aria-label="Filter by course"
        defaultValue={searchParams.get("course") ?? ""}
        onChange={(e) => update("course", e.target.value)}
        className="rounded-ctl border border-border-subtle bg-card px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
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
        className="rounded-ctl border border-border-subtle bg-card px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
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
