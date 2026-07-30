import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverDueNotifications } from "@/lib/push/deliver";

/** SR-04 (docs/PRODUCT_REVIEW_3.md): called from NotificationBellClient once
 * per app session (client-side, non-blocking) so a due reminder still shows
 * up promptly while the app is open — the scheduled delivery path
 * (.github/workflows/notifications-cron.yml, every 15 min) is what actually
 * reaches someone who isn't in the app at all. */
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
