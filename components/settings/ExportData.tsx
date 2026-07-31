const CSV_RESOURCES = [
  { type: "assignments", label: "Assignments" },
  { type: "grades", label: "Grades" },
  { type: "courses", label: "Courses" },
  { type: "schedule", label: "Schedule" },
  { type: "focus", label: "Focus sessions" },
] as const;

/** F-05/§5 "Xuất dữ liệu": plain <a href> downloads — the route handler sets
 * Content-Disposition, so no client JS or blob wrangling is needed. */
export function ExportData() {
  return (
    <div className="flex flex-col gap-2.5 text-xs font-bold text-ink-2">
      Export your data
      <a
        href="/api/export?format=json&type=all"
        className="flex min-h-11 items-center justify-center rounded-ctl bg-line px-3.5 text-sm font-bold text-foreground hover:bg-line-hover"
      >
        Download everything (JSON)
      </a>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {CSV_RESOURCES.map((r) => (
          <a
            key={r.type}
            href={`/api/export?format=csv&type=${r.type}`}
            className="flex min-h-11 items-center rounded-pill bg-line px-3 text-[11.5px] font-bold text-ink-2 hover:bg-line-hover"
          >
            {r.label} (CSV)
          </a>
        ))}
      </div>
    </div>
  );
}
