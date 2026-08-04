import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import { sectionForAssignment } from "@/lib/rules/assignment";
import { KpiCard } from "./KpiCard";

export async function ActiveTasksKpi() {
  const supabase = await createClient();
  const timeZone = await getViewerTimeZone();

  // Selects rows rather than a head-only count because the hint now reports
  // how many of them need attention — reusing the same overdue/high-priority
  // bucketing the Assignments page's "Needs attention" section uses, so the
  // two surfaces can never disagree about what "needs attention" means.
  const { data } = await supabase
    .from("assignments")
    .select("due_at, status, priority, archived_at")
    .is("archived_at", null)
    .neq("status", "done");

  const rows = data ?? [];
  const now = new Date();
  const attentionCount = rows.filter(
    (r) =>
      sectionForAssignment(
        { dueAt: r.due_at, status: r.status, priority: r.priority, archivedAt: r.archived_at },
        now,
        timeZone,
      ) === "attention",
  ).length;

  return (
    <KpiCard
      tone="coral"
      label="Active tasks"
      value={String(rows.length)}
      hint={attentionCount > 0 ? `${attentionCount} need attention` : "Nothing urgent right now"}
      icon={<ClipboardList className="h-6 w-6" />}
    />
  );
}
