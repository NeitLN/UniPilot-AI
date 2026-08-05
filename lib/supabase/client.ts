import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { supabaseUrl, supabaseAnonKey } from "./env";

/**
 * Supabase client for Client Components. Only ever uses the public anon
 * key — never import this from server-only code that needs elevated access.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
