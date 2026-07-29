"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarForUser } from "@/lib/calendar/sync";
import { courseBelongsToCaller } from "@/lib/supabase/ownership";

export interface SyncNowResult {
  status: "ok" | "error";
  message?: string;
  eventCount?: number;
}

export async function syncNow(): Promise<SyncNowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Session expired — sign in again." };
  }

  const result = await syncCalendarForUser(supabase, user.id);
  revalidatePath("/schedule");

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "not_connected"
          ? "Google Calendar isn't connected."
          : result.message,
    };
  }
  return { status: "ok", eventCount: result.eventCount };
}

export async function assignCourseToBlock(
  blockId: string,
  courseId: string | null,
) {
  const supabase = await createClient();

  if (courseId && !(await courseBelongsToCaller(supabase, courseId))) {
    throw new Error("That course isn't yours to link.");
  }

  const { error } = await supabase
    .from("class_blocks")
    .update({ course_id: courseId })
    .eq("id", blockId);

  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}
