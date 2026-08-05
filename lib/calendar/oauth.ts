import "server-only";

// TC-03: the Google client secret never reaches the client — every call in
// this file runs in a Route Handler or Server Action.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// §5 "Đồng bộ 2 chiều Google Calendar": was calendar.readonly, which only
// covers the existing pull sync (Schedule <- Google). calendar.events grants
// read *and* write on events (not calendar-level settings), the minimum
// needed to also push confirmed study sessions (Planner -> Google) without
// requesting full calendar access. Existing connections were consented under
// the old, narrower scope — Google requires a fresh consent screen for the
// new one, so already-connected users see the connect flow again the next
// time they visit /schedule (last_sync_status flips to "error" on the first
// call that gets an insufficient-scope response, same as any other sync error).
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

/** Builds the consent-screen URL. `state` should be an opaque, unguessable value. */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: env("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: env("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${await res.text()}`);
  }
  return res.json();
}

/** Refresh tokens don't rotate for this flow, so the response has no new one. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<Omit<GoogleTokenResponse, "refresh_token">> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${await res.text()}`);
  }
  return res.json();
}
