import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * FR-21 (docs/PRODUCT_REVIEW.md) — exchanges the token_hash Supabase's
 * password-recovery (and other OTP-based) emails link to for a real
 * session, then hands off to `next`. Session cookies are set as a side
 * effect of verifyOtp() on the SSR client, so this has to be a Route
 * Handler — a Server Component can't set cookies during render.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Expired, already-used, or malformed link — no session got established,
  // and reset-password's own page checks for exactly that to show a
  // "request a new link" state rather than a raw error page.
  return NextResponse.redirect(new URL("/reset-password", request.url));
}
