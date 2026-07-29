import "server-only";
import { cookies } from "next/headers";
import { TIMEZONE_COOKIE } from "./timezoneConstants";

/**
 * The viewer's IANA timezone, captured client-side (see TimezoneCookie).
 * Undefined until that cookie lands on the first request — callers should
 * fall back to their own default (lib/rules/focus.ts defaults to the
 * server's local zone) rather than guessing.
 */
export async function getViewerTimeZone(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(TIMEZONE_COOKIE)?.value || undefined;
}
