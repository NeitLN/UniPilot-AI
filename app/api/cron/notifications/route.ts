import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { deliverAllDueNotifications } from "@/lib/push/deliver";

/**
 * FR-03: the actual scheduled trigger — /api/push/send only delivers for
 * whichever user is signed in and currently viewing a page, so a reminder
 * never reaches someone who isn't in the app at the scheduled time. This
 * route sweeps every user's due notifications and is meant to be hit on a
 * schedule (see vercel.json's `crons` entry), authenticated with CRON_SECRET
 * rather than a user session since no user is signed in when it fires.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const result = await deliverAllDueNotifications(supabase);
  return NextResponse.json(result);
}
