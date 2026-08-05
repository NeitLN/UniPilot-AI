/**
 * SEC-02 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — the Supabase credentials
 * were read with non-null assertions (`process.env.X!`), so a deploy missing
 * one failed somewhere inside the Supabase client with an opaque message
 * instead of naming the variable.
 *
 * Same shape as the `env()` helpers already in lib/calendar/oauth.ts and
 * lib/gemini/client.ts, kept here rather than shared with them because those
 * are server-only and this one is also imported by the browser client.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Read as a whole literal, never `process.env[name]`. Next.js inlines
 * NEXT_PUBLIC_* variables into the client bundle by matching the literal
 * text `process.env.NEXT_PUBLIC_FOO` at build time — a dynamic lookup is
 * invisible to that substitution and would arrive undefined in the browser.
 */
export const supabaseUrl = () =>
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabaseAnonKey = () =>
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabaseServiceRoleKey = () =>
  requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
