import { createClient } from "@/lib/supabase/server";
import { gpaBySemester } from "@/lib/rules/gpa";
import { GpaTrendChart } from "@/components/gpa/GpaTrendChart";

export async function GpaTrendCard() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grades")
    .select("semester, grade_point, credit_hours");

  const rows = (data ?? []).map((g) => ({
    semester: g.semester,
    gradePoint: g.grade_point,
    creditHours: g.credit_hours,
  }));

  return <GpaTrendChart points={gpaBySemester(rows)} />;
}

export function GpaTrendCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-white p-5">
      <div className="h-5 w-24 rounded-full bg-line" />
      <div className="mt-4 h-[120px] rounded-ctl bg-line" />
    </div>
  );
}
