import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarForUser } from "@/lib/calendar/sync";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
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
