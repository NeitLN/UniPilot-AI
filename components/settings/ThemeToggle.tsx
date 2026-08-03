"use client";

import { useSyncExternalStore } from "react";
import {
  applyTheme,
  getServerTheme,
  getStoredTheme,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
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
      Appearance
      <div className="flex gap-1.5 rounded-ctl bg-line p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => choose(opt.value)}
            aria-pressed={pref === opt.value}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-[calc(var(--radius-ctl)-4px)] text-xs font-bold transition-colors ${
              pref === opt.value
                ? "bg-card text-foreground shadow-sm"
                : "text-ink-2 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
