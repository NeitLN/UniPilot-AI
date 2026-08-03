"use client";

import { useState, useTransition } from "react";
import { ClipboardList, AlertTriangle, FileBarChart, Clock } from "lucide-react";
import {
  updateNotificationPreference,
  type NotificationCategory,
  type NotificationCategoryKey,
} from "@/app/(app)/settings/actions";
import { PushNotificationSettings } from "@/components/settings/PushNotificationSettings";
import { IconChip, type IconChipTone } from "@/components/ui/IconChip";
import { FieldError } from "@/components/ui/FieldError";

const CATEGORIES: {
  key: NotificationCategoryKey;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: IconChipTone;
}[] = [
  {
    key: "assignment_reminders",
    label: "Assignment reminders",
    hint: "Nudges before something is due.",
    icon: ClipboardList,
    tone: "violet",
  },
  {
    key: "workload_warnings",
    label: "Workload warnings",
    hint: "When your weekly balance score crosses the threshold.",
    icon: AlertTriangle,
    tone: "tangerine",
  },
  {
    key: "weekly_report",
    label: "Weekly report",
    hint: "A recap of your week, once it's ready.",
    icon: FileBarChart,
    tone: "mint",
  },
  {
    key: "focus_reminders",
    label: "Focus reminders",
    hint: "Gentle prompts to start a focus session.",
    icon: Clock,
    tone: "sky",
  },
];

/** Step 8.5 — category preferences, distinct from the browser push
 * permission handled by PushNotificationSettings below them. Each toggle
 * is optimistic but rolls back on a failed write (row is the only source
 * of truth — `notification_preferences`, migration 0016), so a toggle
 * never claims to be saved when it isn't. */
export function NotificationPreferencesCard({ initial }: { initial: NotificationCategory }) {
  const [prefs, setPrefs] = useState(initial);
  const [pendingKey, setPendingKey] = useState<NotificationCategoryKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(key: NotificationCategoryKey) {
    const nextValue = !prefs[key];
    setError(null);
    setPendingKey(key);
    setPrefs((prev) => ({ ...prev, [key]: nextValue }));

    startTransition(async () => {
      try {
        await updateNotificationPreference(key, nextValue);
      } catch {
        setPrefs((prev) => ({ ...prev, [key]: !nextValue }));
        setError("Couldn't save that — try again.");
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <p className="text-xs font-bold text-ink-2">Notify me about</p>
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center gap-3">
            <IconChip
              icon={<cat.icon className="h-4 w-4" aria-hidden="true" />}
              tone={cat.tone}
              size="sm"
              square
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{cat.label}</p>
              <p className="text-[11.5px] font-semibold text-ink-3">{cat.hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[cat.key]}
              aria-label={cat.label}
              disabled={pendingKey === cat.key}
              onClick={() => toggle(cat.key)}
              className={`relative flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors before:absolute before:inset-x-0 before:-inset-y-2.5 disabled:opacity-60 ${
                prefs[cat.key] ? "bg-violet" : "bg-line"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  prefs[cat.key] ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
        {error && <FieldError className="text-[11px]">{error}</FieldError>}
      </div>

      <div className="border-t border-border-subtle-2 pt-3.5">
        <PushNotificationSettings />
      </div>
    </div>
  );
}
