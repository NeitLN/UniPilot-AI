// Pure mapping: Google Calendar API v3 event -> class_blocks row.
// Deliberately omits course_id so an upsert never clobbers a course the user
// already linked to this block (docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 4).

export interface GoogleCalendarEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export interface ClassBlockUpsertRow {
  user_id: string;
  gcal_event_id: string;
  title: string;
  location: string | null;
  start_at: string;
  end_at: string;
  synced_at: string;
}

function toIso(point: { dateTime?: string; date?: string } | undefined): string | null {
  if (!point) return null;
  if (point.dateTime) return new Date(point.dateTime).toISOString();
  if (point.date) return new Date(`${point.date}T00:00:00.000Z`).toISOString();
  return null;
}

/** Returns null for events we shouldn't cache (cancelled, or missing a time range). */
export function mapGoogleEventToClassBlock(
  event: GoogleCalendarEvent,
  userId: string,
  syncedAt = new Date(),
): ClassBlockUpsertRow | null {
  if (event.status === "cancelled") return null;

  const startAt = toIso(event.start);
  const endAt = toIso(event.end);
  if (!startAt || !endAt) return null;

  return {
    user_id: userId,
    gcal_event_id: event.id,
    title: event.summary?.trim() || "Untitled event",
    location: event.location?.trim() || null,
    start_at: startAt,
    end_at: endAt,
    synced_at: syncedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// study_sessions row -> Google Calendar API v3 event body (the push half
// of §5 "Đồng bộ 2 chiều Google Calendar" — see lib/calendar/push.ts for
// the network/DB side that calls this).
// ─────────────────────────────────────────────────────────────

export interface StudySessionLike {
  id: string;
  startAt: string;
  endAt: string;
  title: string;
}

export interface GoogleCalendarEventBody {
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  // Tags the event as UniPilot-originated — lets a future feature tell a
  // pushed session apart from a class the user added directly in Google,
  // without needing a second lookup table.
  extendedProperties: { private: { unipilotSessionId: string } };
}

export function buildCalendarEventBody(session: StudySessionLike): GoogleCalendarEventBody {
  return {
    summary: `Study: ${session.title}`,
    start: { dateTime: new Date(session.startAt).toISOString() },
    end: { dateTime: new Date(session.endAt).toISOString() },
    extendedProperties: { private: { unipilotSessionId: session.id } },
  };
}
