"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const STATUS_OPTIONS = [
  { value: "", label: "All courses" },
  { value: "attention", label: "Needs attention" },
  { value: "caught_up", label: "All caught up" },
];

export function CourseFilters({ semesters }: { semesters: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
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
    <div className="flex flex-col gap-3 rounded-card-sm bg-card p-3.5 lg:flex-row lg:items-center">
      <input
        type="search"
        aria-label="Search courses"
        placeholder="Search courses…"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-ctl border border-border-subtle bg-canvas px-4 text-sm font-semibold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Course status filter"
          options={STATUS_OPTIONS}
          value={searchParams.get("status") ?? ""}
          onChange={(v) => update("status", v)}
        />

        <select
          aria-label="Filter by semester"
          value={searchParams.get("semester") ?? ""}
          onChange={(e) => update("semester", e.target.value)}
          className="min-h-11 min-w-0 max-w-[45%] truncate rounded-ctl border border-border-subtle bg-canvas px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          <option value="">All semesters</option>
          {semesters.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
