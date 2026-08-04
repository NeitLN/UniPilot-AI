import { createClient } from "@/lib/supabase/server";
import { gpaBySemester } from "@/lib/rules/gpa";
import { GpaTrendMini } from "./GpaTrendMini";

export async function GpaTrendCard() {
  const supabase = await createClient();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("grades").select("semester, grade_point, credit_hours"),
    supabase.from("profiles").select("target_gpa").maybeSingle(),
  ]);

  const rows = (data ?? []).map((g) => ({
    semester: g.semester,
    gradePoint: g.grade_point,
    creditHours: g.credit_hours,
  }));

  return <GpaTrendMini points={gpaBySemester(rows)} targetGpa={profile?.target_gpa ?? null} />;
}

export function GpaTrendCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-card p-5">
      <div className="h-5 w-24 rounded-full bg-line" />
      <div className="mt-4 h-[120px] rounded-ctl bg-line" />
    </div>
  );
}
