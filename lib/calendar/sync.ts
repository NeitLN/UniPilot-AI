import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { refreshAccessToken, GoogleTokenRevokedError } from "./oauth";
import { reportError } from "@/lib/observability/report";
import { decryptToken } from "./tokenCrypto";
import { mapGoogleEventToClassBlock, type GoogleCalendarEvent } from "./map";

const EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const WINDOW_BEFORE_DAYS = 7;
const WINDOW_AFTER_DAYS = 60;
const PAGE_SIZE = 250;
const MAX_PAGES = 20; // safety cap (5,000 events) against a runaway paging loop

export type SyncResult =
  | { ok: true; eventCount: number }
  | { ok: false; reason: "not_connected" }
  | { ok: false; reason: "sync_error"; message: string };

/**
 * Syncs the signed-in user's primary Google Calendar into class_blocks.
 * BR-03: on any failure, the existing cache is left untouched and the
 * connection row records the error so the UI can show a banner — never a
 * blank Schedule page.
 */
export async function syncCalendarForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<SyncResult> {
  const { data: connection, error: connectionError } = await supabase
    .from("google_calendar_connections")
    .select("refresh_token, access_token, access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (connectionError || !connection) {
    return { ok: false, reason: "not_connected" };
  }

  try {
    const accessToken = await getFreshAccessToken(supabase, userId, connection);
    const events = await fetchEvents(accessToken);
    const syncedAt = new Date();

    const rows = events
      .map((event) => mapGoogleEventToClassBlock(event, userId, syncedAt))
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("class_blocks")
        .upsert(rows, { onConflict: "user_id,gcal_event_id" });
      if (upsertError) throw new Error(upsertError.message);
    }

    await supabase
      .from("google_calendar_connections")
      .update({
        last_synced_at: syncedAt.toISOString(),
        last_sync_status: "ok",
        last_sync_error: null,
      })
      .eq("user_id", userId);

    return { ok: true, eventCount: rows.length };
  } catch (err) {
    // `err.message` for most failures here is Google's raw OAuth/API error
    // body (see oauth.ts) — never fit to store as something a student reads
    // on the Schedule page. GoogleTokenRevokedError is the one case whose
    // .message is already written for a person; everything else collapses
    // to one generic sentence, with the real detail sent to the server log
    // instead of the row the UI reads.
    const message =
      err instanceof GoogleTokenRevokedError
        ? err.message
        : "Couldn't sync Google Calendar right now. Try again shortly.";

    if (err instanceof GoogleTokenRevokedError) {
      // A revoked refresh token cannot be un-revoked — Google does not
      // renew one, it has to be reissued through the consent screen. Leaving
      // the row in place with a dead refresh_token (not-null in the schema,
      // so it can't just be cleared) kept the app reporting `connected:
      // true` forever: the Schedule header's only button stayed "Sync
      // Google Calendar" -> syncNow(), which would fail this exact way on
      // every click with no way to actually reach /api/calendar/oauth/start
      // and reconnect. Deleting the row makes `connected` false again, so
      // the UI falls back to the same "Connect" link that already works —
      // reconnecting is not a distinct flow from connecting, since Google
      // requires the same full consent round-trip either way. It also stops
      // every later click from spending an external API round trip on a
      // call that cannot succeed.
      await supabase.from("google_calendar_connections").delete().eq("user_id", userId);
    } else {
      await reportError(err, { source: "calendar.sync", userId });
      // Cache in class_blocks is intentionally left alone here (BR-03).
      await supabase
        .from("google_calendar_connections")
        .update({ last_sync_status: "error", last_sync_error: message })
        .eq("user_id", userId);
    }

    return { ok: false, reason: "sync_error", message };
  }
}

/** Exported for lib/calendar/push.ts, which needs the same
 * refresh-if-stale logic to get a token before pushing events. */
export async function getFreshAccessToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  connection: {
    refresh_token: string;
    access_token: string | null;
    access_token_expires_at: string | null;
  },
): Promise<string> {
  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;

  if (connection.access_token && expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(decryptToken(connection.refresh_token));
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await supabase
    .from("google_calendar_connections")
    .update({
      access_token: refreshed.access_token,
      access_token_expires_at: newExpiresAt.toISOString(),
    })
    .eq("user_id", userId);

  return refreshed.access_token;
}

async function fetchEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const timeMin = new Date(now.getTime() - WINDOW_BEFORE_DAYS * 86_400_000);
  const timeMax = new Date(now.getTime() + WINDOW_AFTER_DAYS * 86_400_000);

  const items: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(PAGE_SIZE),
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${EVENTS_ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Google Calendar API error: ${await res.text()}`);
    }

    const body: { items?: GoogleCalendarEvent[]; nextPageToken?: string } = await res.json();
    items.push(...(body.items ?? []));

    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }

  return items;
}
