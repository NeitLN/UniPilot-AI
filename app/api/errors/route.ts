import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/observability/report";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * DEVOPS-02 — the client half of error reporting. An error inside a client
 * component or an error boundary never reaches server logs on its own.
 *
 * Authenticated only. This is a write surface that an anonymous caller
 * could otherwise use to flood the logs, and in practice the errors worth
 * collecting happen to signed-in users on app routes. An unauthenticated
 * failure still shows in that user's own console, same as before.
 */

/** Enough for a real stack, small enough that this cannot be used to push
 * bulk data into the logs. */
const MAX_FIELD = 4000;

function clamp(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.slice(0, MAX_FIELD);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // 204 rather than 401: the caller is an error handler, and giving it an
    // error to handle is how reporting turns one failure into two.
    return new NextResponse(null, { status: 204 });
  }

  const limit = await consumeRateLimit(supabase, RATE_LIMITS.errorReport);
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const message = clamp(input.message) ?? "Unknown client error";
  const error = Object.assign(new Error(message), {
    stack: clamp(input.stack),
    name: clamp(input.name) ?? "Error",
  });

  await reportError(error, {
    source: clamp(input.source) ?? "client",
    digest: clamp(input.digest),
    userId: user.id,
    extra: { userAgent: request.headers.get("user-agent")?.slice(0, 200) },
  });

  return new NextResponse(null, { status: 204 });
}
