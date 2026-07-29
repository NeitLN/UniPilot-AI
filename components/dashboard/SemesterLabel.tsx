import { createClient } from "@/lib/supabase/server";

/** Derived from the most recently added course — there's no dedicated
 * "current semester" setting, so this is the best real signal available
 * (replaces a previously hardcoded "Semester 253 · week 6"). */
export async function SemesterLabel({ className }: { className?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("semester")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <p className={className}>{data?.semester ? `Semester ${data.semester}` : "No courses yet"}</p>
  );
}

export function SemesterLabelSkeleton({ className }: { className?: string }) {
  return <p className={`${className ?? ""} animate-pulse`}>&nbsp;</p>;
}
