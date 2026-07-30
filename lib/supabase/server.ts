import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads/writes auth cookies via next/headers. Uses the public anon key —
 * RLS still applies per-request based on the caller's session.
 *
 * Wrapped in React's `cache()` so every Server Component within one render
 * pass gets back the *same* client instance instead of constructing its
 * own. That matters beyond avoiding a few redundant object allocations: it
 * lets call-sites like `computeAndStoreRisk` (also `cache()`-wrapped, see
 * lib/risk/compute.ts) dedupe on `(supabase, userId)` — three components on
 * the Dashboard used to each build their own client and each call
 * `computeAndStoreRisk` independently, running its ~7-query fan-out and a
 * DB upsert three times over for the same request (P-01). A stable client
 * reference is what makes that dedupe possible at all.
 */
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no writable cookie jar.
            // Safe to ignore as long as proxy.ts refreshes the session.
          }
        },
      },
    },
  );
});
