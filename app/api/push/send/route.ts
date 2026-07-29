import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverDueNotifications } from "@/lib/push/deliver";

/** Also called directly (not via fetch) from NotificationBell on each page
 * load, same pattern as risk compute — this route exists for an external
 * trigger (e.g. a future scheduled cron) per
 * docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 9. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const result = await deliverDueNotifications(supabase, user.id);
  return NextResponse.json(result);
}
