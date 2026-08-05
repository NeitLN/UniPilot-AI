import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabaseUrl, supabaseServiceRoleKey } from "./env";

/**
 * Supabase client using the service_role key — bypasses RLS entirely.
 * Only for trusted server-side jobs (cron, webhooks, admin tasks) that
 * explicitly need cross-user access. The `server-only` import makes any
 * accidental Client Component import fail at build time.
 */
export function createServiceClient() {
  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
