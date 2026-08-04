import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { consumeRateLimit, rateLimitHeaders, retryAfterSeconds, RATE_LIMITS } = await import(
  "@/lib/rate-limit"
);

/**
 * SEC-01 — the counting itself lives in consume_rate_limit() (migration
 * 0020) because only the database can make it atomic. These cover the thin
 * layer around it, where the failure modes are: mis-reporting a denial,
 * handing a client a Retry-After it will immediately violate, and taking a
 * feature offline because the limiter itself broke.
 */

function client(response: { data?: unknown; error?: unknown }) {
  return { rpc: vi.fn(async () => response) } as never;
}

describe("consumeRateLimit", () => {
  it("passes the rule through to the database function", async () => {
    const c = { rpc: vi.fn(async () => ({ data: [{ allowed: true, remaining: 9, reset_at: new Date().toISOString() }] })) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await consumeRateLimit(c as any, RATE_LIMITS.planGenerate);
    expect(c.rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_route: "plan.generate",
      p_limit: 10,
      p_window_seconds: 3600,
    });
  });

  it("reports a denial", async () => {
    const resetAt = new Date(Date.now() + 120_000);
    const out = await consumeRateLimit(
      client({ data: [{ allowed: false, remaining: 0, reset_at: resetAt.toISOString() }] }),
      RATE_LIMITS.planGenerate,
    );
    expect(out.allowed).toBe(false);
    expect(out.remaining).toBe(0);
  });

  it("fails open when the limiter itself errors", async () => {
    // A broken limiter must not take the feature down with it. It can never
    // fail open on a denial, because a denial only comes from a successful
    // call — so the worst case here is one unmetered request, not a bypass.
    const out = await consumeRateLimit(
      client({ error: { message: "relation does not exist" } }),
      RATE_LIMITS.export,
    );
    expect(out.allowed).toBe(true);
  });

  it("fails open when the function returns nothing", async () => {
    const out = await consumeRateLimit(client({ data: [] }), RATE_LIMITS.export);
    expect(out.allowed).toBe(true);
  });
});

describe("retryAfterSeconds", () => {
  it("rounds up so a client never retries a moment too early", () => {
    const now = new Date("2026-08-05T10:00:00.000Z");
    expect(retryAfterSeconds(new Date("2026-08-05T10:00:30.400Z"), now)).toBe(31);
  });

  it("never returns 0, which would invite an immediate retry into another 429", () => {
    const now = new Date("2026-08-05T10:00:00.000Z");
    expect(retryAfterSeconds(new Date("2026-08-05T09:59:00.000Z"), now)).toBe(1);
    expect(retryAfterSeconds(now, now)).toBe(1);
  });
});

describe("rateLimitHeaders", () => {
  it("states the limit, what is left, and when it resets", () => {
    const now = new Date("2026-08-05T10:00:00.000Z");
    const headers = rateLimitHeaders(
      RATE_LIMITS.planGenerate,
      { allowed: false, remaining: 0, resetAt: new Date("2026-08-05T10:05:00.000Z") },
      now,
    );
    expect(headers).toEqual({
      "Retry-After": "300",
      "RateLimit-Limit": "10",
      "RateLimit-Remaining": "0",
      "RateLimit-Reset": "300",
    });
  });
});

describe("RATE_LIMITS", () => {
  it("keeps the paid AI route on the tightest ceiling", () => {
    // If this ever inverts, the route that costs money per call would be the
    // most permissive one.
    expect(RATE_LIMITS.planGenerate.limit).toBeLessThan(RATE_LIMITS.export.limit);
    expect(RATE_LIMITS.export.limit).toBeLessThan(RATE_LIMITS.calendarSync.limit);
    // Error reports are the cheapest thing here and the one most likely to
    // arrive in a burst, so it gets the loosest ceiling.
    expect(RATE_LIMITS.calendarSync.limit).toBeLessThan(RATE_LIMITS.errorReport.limit);
  });

  it("uses stable route keys, since they are stored as data", () => {
    expect(Object.values(RATE_LIMITS).map((r) => r.key)).toEqual([
      "plan.generate",
      "export",
      "calendar.sync",
      "error.report",
    ]);
  });
});
