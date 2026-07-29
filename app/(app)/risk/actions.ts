"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markWarningHandled(warningId: string, actionTaken: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("risk_warnings")
    .update({ status: "handled", action_taken: actionTaken })
    .eq("id", warningId);
  if (error) throw new Error(error.message);

  revalidatePath("/risk");
  revalidatePath("/");
}

export async function dismissWarning(warningId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("risk_warnings")
    .update({ status: "dismissed" })
    .eq("id", warningId);
  if (error) throw new Error(error.message);

  revalidatePath("/risk");
  revalidatePath("/");
}
