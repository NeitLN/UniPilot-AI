"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor, CheckCircle2 } from "lucide-react";
import {
  applyTheme,
  getServerTheme,
  getStoredTheme,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  // useSyncExternalStore is the correct tool for "read state that lives
  // outside React" (localStorage here) — it renders getServerTheme's
  // "system" on the server and first client pass (matching exactly, so
  // there's no hydration mismatch to suppress), then swaps to the real
  // stored value once subscribed. A prior version used useState + a lazy
  // initializer + suppressHydrationWarning; that mismatch-suppression
  // turned out to also freeze the affected DOM attributes' internal React
  // bookkeeping, so a returning user's real theme (e.g. "dark") never
  // visually showed as selected even after later re-renders.
  const pref = useSyncExternalStore(subscribeTheme, getStoredTheme, getServerTheme);

  function choose(next: ThemePreference) {
    applyTheme(next);
  }

  return (
    <div className="flex flex-col gap-1.5 text-xs font-bold text-ink-2">
      Choose your visual theme
      <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-2.5">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = pref === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              onClick={() => choose(opt.value)}
              aria-checked={isActive}
              className={`relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-ctl border-2 transition-colors ${
                isActive
                  ? "border-violet bg-violet-tint"
                  : "border-border-subtle bg-card hover:bg-line"
              }`}
            >
              {isActive && (
                <CheckCircle2
                  className="absolute right-1.5 top-1.5 h-4 w-4 text-violet-text"
                  aria-hidden="true"
                  fill="currentColor"
                />
              )}
              <Icon
                className={`h-5 w-5 ${isActive ? "text-violet-text" : "text-ink-2"}`}
                aria-hidden="true"
              />
              <span className={`text-xs font-bold ${isActive ? "text-violet-text" : "text-ink-2"}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] font-semibold text-ink-3">
        {pref === "system"
          ? "System will match your device settings."
          : `Always use ${pref} theme.`}
      </p>
    </div>
  );
}
