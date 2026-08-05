import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Confirms `courseId` is one of the caller's own courses before it gets
 * written onto an assignment or class_block. RLS only guards a row's own
 * user_id — it doesn't stop someone from pointing course_id at a course
 * they don't own, since that's a same-table foreign key with no ownership
 * check of its own. A miss here (not found vs. not yours) is treated the
 * same way on purpose: RLS already hides other users' courses, so a
 * "not found" is indistinguishable from "not yours".
 */
export async function courseBelongsToCaller(
  supabase: SupabaseClient<Database>,
  courseId: string,
): Promise<boolean> {
  const { data } = await supabase.from("courses").select("id").eq("id", courseId).maybeSingle();
  return data !== null;
}

/** Same reasoning as courseBelongsToCaller, for logging a focus session against an assignment. */
export async function assignmentBelongsToCaller(
  supabase: SupabaseClient<Database>,
  assignmentId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("assignments")
    .select("id")
    .eq("id", assignmentId)
    .maybeSingle();
  return data !== null;
}
