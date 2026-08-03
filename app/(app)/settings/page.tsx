import { createClient } from "@/lib/supabase/server";
import { getNotificationPreferences } from "@/app/(app)/settings/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { StudyPreferencesForm } from "@/components/settings/StudyPreferencesForm";
import { AppearanceCard } from "@/components/settings/AppearanceCard";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import { ConnectionsCard } from "@/components/settings/ConnectionsCard";
import { DataPrivacyCard } from "@/components/settings/DataPrivacyCard";
import { Pilo } from "@/components/brand/Pilo";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: connection }, notificationPrefs] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, weekly_availability_hours, target_gpa, default_focus_minutes, daily_focus_goal_cycles, preferred_study_days",
      )
      .maybeSingle(),
    supabase
      .from("google_calendar_connections")
      .select("connected_at, last_synced_at, last_sync_status, last_sync_error")
      .maybeSingle(),
    getNotificationPreferences(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" subtitle={user?.email} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[1fr_3fr]">
        <SettingsNav />

        <div className="flex flex-col gap-4">
          <SettingsSection id="profile" title="Profile">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Pilo mood="ready" size={56} className="shrink-0" />
              <div className="flex flex-1 flex-col gap-3.5">
                <p className="text-xs font-bold text-ink-2">
                  Email
                  <span className="mt-1 block text-sm font-semibold text-foreground">
                    {user?.email}
                  </span>
                </p>
                <SettingsForm initialFullName={profile?.full_name ?? ""} />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="study-preferences"
            title="Study preferences"
            description="Feeds the AI Planner, Focus Timer, and Workload Risk score."
          >
            <StudyPreferencesForm
              initialValues={{
                weeklyAvailabilityHours: profile?.weekly_availability_hours ?? 0,
                targetGpa: profile?.target_gpa ?? null,
                defaultFocusMinutes: profile?.default_focus_minutes ?? 25,
                dailyFocusGoalCycles: profile?.daily_focus_goal_cycles ?? 4,
                preferredStudyDays: profile?.preferred_study_days ?? [1, 2, 3, 4, 5],
              }}
            />
          </SettingsSection>

          <SettingsSection id="appearance" title="Appearance">
            <AppearanceCard />
          </SettingsSection>

          <SettingsSection id="notifications" title="Notifications">
            <NotificationPreferencesCard initial={notificationPrefs} />
          </SettingsSection>

          <SettingsSection id="connections" title="Connections">
            <ConnectionsCard
              connected={Boolean(connection)}
              lastSyncedAt={connection?.last_synced_at ?? null}
              lastSyncStatus={connection?.last_sync_status ?? "never"}
              lastSyncError={connection?.last_sync_error ?? null}
            />
          </SettingsSection>

          {user?.email && (
            <SettingsSection id="data-privacy" title="Data & privacy">
              <DataPrivacyCard userEmail={user.email} />
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}
