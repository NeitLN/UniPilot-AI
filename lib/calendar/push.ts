import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getFreshAccessToken } from "./sync";
import { buildCalendarEventBody, type GoogleCalendarEventBody } from "./map";

const EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function insertEvent(accessToken: string, body: GoogleCalendarEventBody): Promise<string> {
  const res = await fetch(EVENTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Google Calendar push failed: ${await res.text()}`);
  }
  const created: { id: string } = await res.json();
  return created.id;
}

export type PushResult =
  | { ok: true; pushed: number }
  | { ok: false; reason: "not_connected" }
  | { ok: false; reason: "push_error"; message: string };

/**
 * §5 "Đồng bộ 2 chiều Google Calendar": pushes every not-yet-pushed session
 * in a just-confirmed plan to the user's primary calendar. Best-effort by
 * design — the caller (confirmPlan) must not let a Google failure block
 * confirming the plan itself, since the plan is real regardless of whether
 * it ever reaches Google.
 */
export async function pushConfirmedSessionsToCalendar(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
): Promise<PushResult> {
  const { data: connection } = await supabase
    .from("google_calendar_connections")
    .select("refresh_token, access_token, access_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!connection) return { ok: false, reason: "not_connected" };

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("id, start_at, end_at, assignment_id, gcal_event_id")
    .eq("plan_id", planId)
    .is("gcal_event_id", null);
  if (!sessions || sessions.length === 0) return { ok: true, pushed: 0 };

  const assignmentIds = [...new Set(sessions.map((s) => s.assignment_id).filter((id): id is string => Boolean(id)))];
  const { data: assignments } = assignmentIds.length
    ? await supabase.from("assignments").select("id, title").in("id", assignmentIds)
    : { data: [] as { id: string; title: string }[] };
  const titleById = new Map((assignments ?? []).map((a) => [a.id, a.title]));

  try {
    const accessToken = await getFreshAccessToken(supabase, userId, connection);

    // Every session gets a different gcal_event_id back from Google, so
    // there is no shared value to write with one batched `in(ids)` update
    // the way the notification sweep does it.
    //
    // Deferring the writes until after the loop would batch them, but it
    // trades away crash safety: a crash mid-loop currently orphans at most
    // one Google event, and with the writes deferred it would orphan all of
    // them — every one duplicated on the next retry. So each write is still
    // dispatched the moment its own event exists. It is just no longer
    // awaited before the next insert starts, which is what made every
    // Google call wait out a database round trip first.
    const writes: PromiseLike<unknown>[] = [];
    let pushed = 0;
    for (const session of sessions) {
      const body = buildCalendarEventBody({
        id: session.id,
        startAt: session.start_at,
        endAt: session.end_at,
        title: session.assignment_id ? (titleById.get(session.assignment_id) ?? "study session") : "study session",
      });
      const eventId = await insertEvent(accessToken, body);
      writes.push(supabase.from("study_sessions").update({ gcal_event_id: eventId }).eq("id", session.id));
      pushed++;
    }
    // Surfaces a failed write as push_error rather than losing it silently.
    await Promise.all(writes);

    return { ok: true, pushed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown push error";
    return { ok: false, reason: "push_error", message };
  }
}
