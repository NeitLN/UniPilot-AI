import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * SEC-01 — per-user ceilings on the routes that cost money or do real work.
 *
 * The counting itself is a single atomic statement inside
 * consume_rate_limit() (migration 0020), not a read-then-write here: two
 * concurrent requests from the same user have to serialise on the row's
 * primary key, which application code cannot guarantee.
 */

export interface RateLimitRule {
  /** Stored as-is in rate_limits.route, so keep these stable. */
  key: string;
  limit: number;
  windowSeconds: number;
}

const HOUR = 3600;

export const RATE_LIMITS = {
  /** Reaches a paid Gemini API on every call — the tightest ceiling. */
  planGenerate: { key: "plan.generate", limit: 10, windowSeconds: HOUR },
  /** Walks every table the user owns and serialises the lot. */
  export: { key: "export", limit: 20, windowSeconds: HOUR },
  /** Talks to Google on the user's behalf; their quota, not just ours. */
  calendarSync: { key: "calendar.sync", limit: 30, windowSeconds: HOUR },
} as const satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Records one hit against `rule` for the signed-in caller.
 *
 * Fails open on an unexpected database error: a limiter that is itself
 * broken should not take the feature down with it. It cannot fail open on a
 * *denial*, because the denial only ever comes from a successful call.
 */
export async function consumeRateLimit(
  supabase: SupabaseClient<Database>,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_route: rule.key,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    return {
      allowed: true,
      remaining: rule.limit,
      resetAt: new Date(Date.now() + rule.windowSeconds * 1000),
    };
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at),
  };
}

/** Seconds a client should wait, floored at 1 so a caller never reads
 * `Retry-After: 0` and retries straight into another rejection. */
export function retryAfterSeconds(resetAt: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
}

/** Standard headers for a 429, so a client can back off correctly instead
 * of guessing. */
export function rateLimitHeaders(
  rule: RateLimitRule,
  result: RateLimitResult,
  now: Date = new Date(),
): Record<string, string> {
  return {
    "Retry-After": String(retryAfterSeconds(result.resetAt, now)),
    "RateLimit-Limit": String(rule.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(retryAfterSeconds(result.resetAt, now)),
  };
}
