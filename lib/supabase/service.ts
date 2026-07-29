import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase client using the service_role key — bypasses RLS entirely.
 * Only for trusted server-side jobs (cron, webhooks, admin tasks) that
 * explicitly need cross-user access. The `server-only` import makes any
 * accidental Client Component import fail at build time.
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
