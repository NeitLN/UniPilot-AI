import { Download } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";

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
    <div className="flex flex-col gap-2.5">
      <a
        href="/api/export?format=json&type=all"
        className="flex items-center gap-3 rounded-ctl bg-line px-4 py-3 hover:bg-line-hover"
      >
        <IconChip icon={<Download className="h-[18px] w-[18px]" aria-hidden="true" />} tone="violet" size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">Export my data</span>
          <span className="block text-[11.5px] font-semibold text-ink-3">Download a copy of your data</span>
        </span>
        <span aria-hidden="true" className="text-ink-3">
          ›
        </span>
      </a>
      <div className="flex flex-wrap gap-1.5">
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
