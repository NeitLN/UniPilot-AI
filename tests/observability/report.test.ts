import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const { buildErrorPayload, reportError } = await import("@/lib/observability/report");

/**
 * DEVOPS-02 — the properties that make this useful rather than decorative.
 *
 * `console.error(error)` already existed. What it produced was a stack with
 * no route, no revision and nothing machine-readable, so it could not be
 * searched or alerted on. These tests pin the parts that fix that, plus the
 * one rule that matters most: reporting an error must never itself throw,
 * because it runs from inside error handlers.
 */

describe("buildErrorPayload", () => {
  it("carries the fields a log query needs to be useful", () => {
    const payload = buildErrorPayload(new Error("boom"), {
      source: "/api/plan/generate",
      digest: "1234567",
      userId: "u1",
    });
    expect(payload).toMatchObject({
      level: "error",
      // Fixed event name so a query can find every one of these without
      // matching on message text, which changes constantly.
      event: "unhandled_error",
      message: "boom",
      source: "/api/plan/generate",
      digest: "1234567",
      userId: "u1",
    });
    expect(payload.stack).toContain("boom");
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload).toHaveProperty("revision");
  });

  it("handles a thrown non-Error, which is legal in JavaScript", () => {
    const payload = buildErrorPayload("just a string", { source: "somewhere" });
    expect(payload.message).toBe("just a string");
    expect(payload.name).toBe("Error");
  });
});

describe("reportError", () => {
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    stderr.mockRestore();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("writes exactly one line, so a stack is not split into separate records", async () => {
    await reportError(new Error("multi\nline\nstack"), { source: "test" });
    expect(stderr).toHaveBeenCalledTimes(1);
    const line = stderr.mock.calls[0][0] as string;
    expect(() => JSON.parse(line)).not.toThrow();
    expect(line.split("\n")).toHaveLength(1);
  });

  it("does not call a webhook when none is configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await reportError(new Error("x"), { source: "test" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to the webhook when one is configured", async () => {
    vi.stubEnv("ERROR_WEBHOOK_URL", "https://hooks.example/collect");
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    await reportError(new Error("x"), { source: "test" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://hooks.example/collect");
    expect(JSON.parse(init.body as string)).toMatchObject({ message: "x", source: "test" });
  });

  it("still logs when the webhook fails, and does not throw", async () => {
    // The whole point: reporting an error must not become a second error.
    vi.stubEnv("ERROR_WEBHOOK_URL", "https://hooks.example/collect");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    await expect(reportError(new Error("original"), { source: "test" })).resolves.toBeUndefined();

    const lines = stderr.mock.calls.map((c: unknown[]) => String(c[0]));
    // The original error is logged before the webhook is attempted, so it
    // survives the delivery failure.
    expect(lines.some((l: string) => l.includes('"message":"original"'))).toBe(true);
    expect(lines.some((l: string) => l.includes("error_reporting_failed"))).toBe(true);
  });
});
