import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/calendar/oauth";
import { OAUTH_STATE_COOKIE } from "../start/route";

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL("/schedule", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const deniedOrError = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (deniedOrError) {
    return redirectWithError(request, "access_denied");
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(request, "state_mismatch");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Google only issues a refresh token on first consent. Without it we
      // can't sync in the background later, so surface this instead of
      // silently storing a connection that will break on next refresh.
      return redirectWithError(request, "missing_refresh_token");
    }

    const { error: upsertError } = await supabase
      .from("google_calendar_connections")
      .upsert(
        {
          user_id: user.id,
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          access_token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString(),
          scope: tokens.scope,
          connected_at: new Date().toISOString(),
          last_sync_status: "never",
          last_sync_error: null,
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      return redirectWithError(request, "storage_failed");
    }
  } catch {
    return redirectWithError(request, "token_exchange_failed");
  }

  const response = NextResponse.redirect(
    new URL("/schedule?connected=1", request.url),
  );
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
