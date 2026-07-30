"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface SettingsFormState {
  errors: Partial<Record<"fullName" | "weeklyAvailabilityHours" | "targetGpa", string>>;
  formError?: string;
  ok?: boolean;
}

function readInput(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    weeklyAvailabilityHours: Number(formData.get("weeklyAvailabilityHours")),
    targetGpa: String(formData.get("targetGpa") ?? "").trim(),
  };
}

export async function updateProfile(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const input = readInput(formData);
  const errors: SettingsFormState["errors"] = {};

  if (
    Number.isNaN(input.weeklyAvailabilityHours) ||
    input.weeklyAvailabilityHours < 0
  ) {
    errors.weeklyAvailabilityHours = "Enter 0 or more hours.";
  }

  const targetGpa = input.targetGpa === "" ? null : Number(input.targetGpa);
  if (targetGpa !== null && (Number.isNaN(targetGpa) || targetGpa < 0 || targetGpa > 4)) {
    errors.targetGpa = "Target GPA must be between 0.0 and 4.0.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  // upsert, not update: a signup that predates the on_auth_user_created
  // trigger (0008_profiles_trigger.sql) could still be missing its row.
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: input.fullName || null,
    weekly_availability_hours: input.weeklyAvailabilityHours,
    target_gpa: targetGpa,
  });

  if (error) return { errors: {}, formError: error.message };

  revalidatePath("/settings");
  revalidatePath("/planner");
  revalidatePath("/risk");
  revalidatePath("/gpa");
  revalidatePath("/");
  return { errors: {}, ok: true };
}

/**
 * FR-27 (docs/PRODUCT_REVIEW_2.md) — self-service account deletion. Every
 * table's user_id column is `references auth.users on delete cascade`
 * (migration 0001 onward), so deleting the auth user is the entire
 * operation — the database removes every assignment, course, grade,
 * focus session, study plan, notification, etc. in one cascade, in the
 * correct dependency order, rather than this action guessing that order
 * itself and risking getting it wrong.
 *
 * `confirmEmail` must match the signed-in user's own email exactly —
 * same weight as FR-25's permanent-delete confirmation, but for
 * everything at once instead of one row.
 */
export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — sign in again.");

  const confirmEmail = String(formData.get("confirmEmail") ?? "").trim();
  if (!user.email || confirmEmail !== user.email) {
    throw new Error("Type your email exactly to confirm.");
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  await supabase.auth.signOut();
}
