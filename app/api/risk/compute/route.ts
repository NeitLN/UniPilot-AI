import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeAndStoreRisk } from "@/lib/risk/compute";

/** Thin wrapper around the shared logic — also called directly from the
 * dashboard/risk pages so a page view keeps today's score fresh without an
 * extra round-trip; this route exists for external triggers (e.g. a future
 * scheduled cron) per docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 8. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const result = await computeAndStoreRisk(supabase, user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't compute risk." },
      { status: 500 },
    );
  }
}
