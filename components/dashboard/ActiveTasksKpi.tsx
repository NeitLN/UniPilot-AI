import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "./KpiCard";

export async function ActiveTasksKpi() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .neq("status", "done");

  return (
    <KpiCard
      tone="coral"
      label="Active tasks"
      value={String(count ?? 0)}
      hint="Not done, not archived"
    />
  );
}
