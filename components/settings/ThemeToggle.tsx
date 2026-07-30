"use client";

import { useState } from "react";
import { applyTheme, getStoredTheme, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  // Lazy initializer (not an effect) reads localStorage on first client
  // render — the server always renders "system" highlighted, so the
  // affected attributes below carry suppressHydrationWarning rather than
  // syncing state after mount.
  const [pref, setPref] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : getStoredTheme(),
  );

  function choose(next: ThemePreference) {
    setPref(next);
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
            suppressHydrationWarning
            className={`flex min-h-9 flex-1 items-center justify-center rounded-[calc(var(--radius-ctl)-4px)] text-xs font-bold transition-colors ${
              pref === opt.value
                ? "bg-card text-foreground shadow-sm"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
