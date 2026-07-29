import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, weekly_availability_hours, target_gpa")
    .maybeSingle();

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">{user?.email}</p>
      </div>

      <div className="max-w-md rounded-card bg-white p-5">
        <SettingsForm
          initialValues={{
            fullName: profile?.full_name ?? "",
            weeklyAvailabilityHours: profile?.weekly_availability_hours ?? 0,
            targetGpa: profile?.target_gpa ?? null,
          }}
        />
      </div>
    </div>
  );
}
