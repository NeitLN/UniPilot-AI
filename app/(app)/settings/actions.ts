"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateStudyPreferences } from "@/lib/rules/preferences";
import type { Database } from "@/lib/supabase/types";

export interface SettingsFormState {
  errors: Partial<Record<"fullName", string>>;
  formError?: string;
  ok?: boolean;
}

/** Step 8.2 — Profile card: full name only. Email is read-only (no auth
 * confirmation flow implemented), so it isn't part of this action. */
export async function updateProfile(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  // upsert, not update: a signup that predates the on_auth_user_created
  // trigger (0008_profiles_trigger.sql) could still be missing its row.
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName || null,
  });

  if (error) return { errors: {}, formError: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  return { errors: {}, ok: true };
}

export interface StudyPreferencesFormState {
  errors: Partial<
    Record<
      "weeklyAvailabilityHours" | "targetGpa" | "defaultFocusMinutes" | "dailyFocusGoalCycles" | "preferredStudyDays",
      string
    >
  >;
  formError?: string;
  ok?: boolean;
}

/** Step 8.3 — Study preferences card. Feeds AI Planner (availability/preferred
 * days), Focus (default duration/daily goal), Risk and Weekly Report
 * (availability capacity) — see downstream reads in those pages. */
export async function updateStudyPreferences(
  _prevState: StudyPreferencesFormState,
  formData: FormData,
): Promise<StudyPreferencesFormState> {
  const weeklyAvailabilityHours = Number(formData.get("weeklyAvailabilityHours"));
  const targetGpaRaw = String(formData.get("targetGpa") ?? "").trim();
  const defaultFocusMinutes = Number(formData.get("defaultFocusMinutes"));
  const dailyFocusGoalCycles = Number(formData.get("dailyFocusGoalCycles"));
  const preferredStudyDays = formData.getAll("preferredStudyDays").map(Number);

  const errors: StudyPreferencesFormState["errors"] = {};

  if (Number.isNaN(weeklyAvailabilityHours) || weeklyAvailabilityHours < 0) {
    errors.weeklyAvailabilityHours = "Enter 0 or more hours.";
  }

  const targetGpa = targetGpaRaw === "" ? null : Number(targetGpaRaw);
  if (targetGpa !== null && (Number.isNaN(targetGpa) || targetGpa < 0 || targetGpa > 4)) {
    errors.targetGpa = "Target GPA must be between 0.0 and 4.0.";
  }

  Object.assign(
    errors,
    validateStudyPreferences({ defaultFocusMinutes, dailyFocusGoalCycles, preferredStudyDays }),
  );

  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    weekly_availability_hours: weeklyAvailabilityHours,
    target_gpa: targetGpa,
    default_focus_minutes: defaultFocusMinutes,
    daily_focus_goal_cycles: dailyFocusGoalCycles,
    preferred_study_days: preferredStudyDays,
  });

  if (error) return { errors: {}, formError: error.message };

  revalidatePath("/settings");
  revalidatePath("/planner");
  revalidatePath("/risk");
  revalidatePath("/gpa");
  revalidatePath("/focus");
  revalidatePath("/reports");
  revalidatePath("/");
  return { errors: {}, ok: true };
}

export type NotificationCategory = Database["public"]["Tables"]["notification_preferences"]["Row"];

/** Row is guaranteed to exist (0016_notification_preferences.sql's trigger
 * creates one for every user on signup + backfilled existing users), but
 * falls back to the same defaults as the migration if it's ever missing. */
export async function getNotificationPreferences(): Promise<NotificationCategory> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — sign in again.");

  const { data } = await supabase
    .from("notification_preferences")
    .select("user_id, assignment_reminders, workload_warnings, weekly_report, focus_reminders, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    data ?? {
      user_id: user.id,
      assignment_reminders: true,
      workload_warnings: true,
      weekly_report: true,
      focus_reminders: false,
      updated_at: new Date().toISOString(),
    }
  );
}

export type NotificationCategoryKey = "assignment_reminders" | "workload_warnings" | "weekly_report" | "focus_reminders";

export async function updateNotificationPreference(key: NotificationCategoryKey, value: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — sign in again.");

  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    updated_at: new Date().toISOString(),
    ...({ [key]: value } as Record<NotificationCategoryKey, boolean>),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
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
