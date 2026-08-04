import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarForUser } from "@/lib/calendar/sync";
import { consumeRateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // SEC-01: a ceiling per user, checked right after auth so a rejected
  // caller never reaches the expensive part below.
  const limit = await consumeRateLimit(supabase, RATE_LIMITS.calendarSync);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many calendar syncs in the last hour — try again shortly." },
      { status: 429, headers: rateLimitHeaders(RATE_LIMITS.calendarSync, limit) },
    );
  }

  const result = await syncCalendarForUser(supabase, user.id);

  if (!result.ok) {
    const status = result.reason === "not_connected" ? 400 : 502;
    const message =
      result.reason === "not_connected"
        ? "Google Calendar isn't connected."
        : result.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ eventCount: result.eventCount });
}
