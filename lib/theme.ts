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

export function applyTheme(pref: ThemePreference) {
  const isDark =
    pref === "dark" ||
    (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_STORAGE_KEY, pref);
}

export function getStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}
