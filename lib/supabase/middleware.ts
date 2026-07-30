import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/forgot-password"];

// FR-21 (docs/PRODUCT_REVIEW.md): distinct from PUBLIC_ROUTES on purpose.
// /auth/confirm exchanges a recovery link's token_hash for a session
// *during* this exact request — it must be reachable while `user` is still
// null, before that exchange has happened. /reset-password then needs the
// opposite guarantee PUBLIC_ROUTES gives /login: PUBLIC_ROUTES redirects a
// signed-in user *away*, which would boot someone who just followed their
// reset link off the page the instant their recovery session takes effect,
// before they ever get to set a new password.
//
// SR-01 (docs/PRODUCT_REVIEW_3.md): /api/cron/notifications is a
// server-to-server call (GitHub Actions, previously Vercel's own cron) that
// never carries a user session at all — it authenticates itself via
// CRON_SECRET inside the route handler. Without this exemption every call
// was silently 307-redirected to /login by the check below *before* the
// route handler ever ran, so the CRON_SECRET check never even executed.
// This existed from the very first commit, predating the cron feature
// itself (3f21467) — the endpoint has likely never actually delivered a
// notification via its scheduled trigger, independent of the separate
// once-daily-frequency issue SR-01 also fixes.
const ALWAYS_ACCESSIBLE_ROUTES = [
  "/reset-password",
  "/auth/confirm",
  "/api/cron/notifications",
];

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from protected `(app)` routes, and signed-in
 * users away from /login. Called from the root proxy.ts.
 *
 * This is an optimistic check only (reads the session cookie / calls the
 * Auth server) — real authorization still happens via RLS on every query.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() re-validates the JWT against the Auth server — do not
  // replace with getSession(), which only reads the (possibly stale) cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (!user && !isPublicRoute && !isAlwaysAccessible) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
