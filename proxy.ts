import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed Middleware to Proxy — same runtime, same file contract.
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets, so the session cookie stays
     * fresh everywhere, but skip Next.js internals and image optimization.
     * sw.js must never be redirected — the Service Worker spec disallows a
     * redirected script response outright, which broke registration on the
     * (unauthenticated) /login page before this was excluded.
     * manifest.json needs the same exclusion (SR-06, docs/PRODUCT_REVIEW_3.md):
     * a browser evaluating "Add to Home Screen" eligibility on the
     * unauthenticated /login page fetches it with no session cookie, so
     * without this it also got redirected to an HTML /login response
     * instead of JSON — silently breaking install eligibility for anyone
     * who hadn't already signed in.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
