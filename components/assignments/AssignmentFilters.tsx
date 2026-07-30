"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CourseOption } from "./AssignmentForm";

export function AssignmentFilters({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Filter by course"
        defaultValue={searchParams.get("course") ?? ""}
        onChange={(e) => update("course", e.target.value)}
        className="rounded-ctl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
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
        className="rounded-ctl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-violet"
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
