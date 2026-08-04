import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DEVOPS-02 — a liveness/readiness probe.
 *
 * Deliberately unauthenticated (see ALWAYS_ACCESSIBLE_ROUTES in
 * lib/supabase/middleware.ts): a monitor cannot sign in, and without the
 * exemption every check would be 307'd to /login and report "healthy"
 * regardless of whether the app could actually serve anything.
 *
 * It answers the one question a redirect cannot: can this instance reach
 * the database? A static 200 would stay green through a total outage.
 *
 * Nothing here is sensitive. The query counts rows in a table that is empty
 * for an anonymous caller under RLS, so the response never depends on — or
 * exposes — anyone's data; only the round trip matters.
 */

export const dynamic = "force-dynamic";

interface HealthBody {
  status: "ok" | "degraded";
  /** Set by the platform at build time; "unknown" locally. Lets a monitor
   * tell which revision answered without a second lookup. */
  revision: string;
  checks: { database: { ok: boolean; latencyMs: number; error?: string } };
}

export async function GET() {
  const startedAt = Date.now();
  let database: HealthBody["checks"]["database"];

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });
    database = error
      ? { ok: false, latencyMs: Date.now() - startedAt, error: error.message }
      : { ok: true, latencyMs: Date.now() - startedAt };
  } catch (cause) {
    database = {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: cause instanceof Error ? cause.message : "Unknown database error",
    };
  }

  const body: HealthBody = {
    status: database.ok ? "ok" : "degraded",
    revision:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.GITHUB_SHA ??
      "unknown",
    checks: { database },
  };

  // 503 on a failed check so an uptime monitor treats it as down without
  // needing to parse the body.
  return NextResponse.json(body, {
    status: database.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
