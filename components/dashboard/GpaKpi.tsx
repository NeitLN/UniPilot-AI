import { createClient } from "@/lib/supabase/server";
import { gpa } from "@/lib/rules/gpa";
import { KpiCard } from "./KpiCard";

export async function GpaKpi() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grades")
    .select("grade_point, credit_hours");

  const rows = (data ?? []).map((g) => ({
    gradePoint: g.grade_point,
    creditHours: g.credit_hours,
  }));
  const hasGrades = rows.length > 0;

  return (
    <KpiCard
      tone="violet"
      label="GPA"
      value={hasGrades ? gpa(rows).toFixed(2) : "—"}
      unit={hasGrades ? "/4.0" : undefined}
      hint={hasGrades ? "Cumulative" : "Enter grades to see your GPA"}
    />
  );
}
