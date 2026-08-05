// F-06 — dark mode. Kept framework-free (no next-themes dependency) since
// the app only needs three states and one class toggle.
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "unipilot:theme";

/** Inlined into a beforeInteractive <script> in app/layout.tsx — must stay
 * self-contained (no imports) since it runs before any JS module loads. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var isDark = stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

// ThemeToggle reads this via useSyncExternalStore rather than useState+effect
// — localStorage.setItem doesn't fire a same-tab "storage" event, so a plain
// external-store subscription would miss the toggle's own writes. Listeners
// notified here close that gap without ThemeToggle needing its own effect.
const listeners = new Set<() => void>();

export function applyTheme(pref: ThemePreference) {
  const isDark =
    pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_STORAGE_KEY, pref);
  listeners.forEach((listener) => listener());
}

export function getStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Server/first-client-render snapshot — always "system", matching what the
 * server rendered, so there's nothing for React to reconcile on hydration. */
export function getServerTheme(): ThemePreference {
  return "system";
}
