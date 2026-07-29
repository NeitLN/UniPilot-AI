import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = "test-only-key-do-not-use-in-prod";
});

describe("encryptToken / decryptToken", () => {
  it("round-trips a token", async () => {
    const { encryptToken, decryptToken } = await import("@/lib/calendar/tokenCrypto");
    const original = "1//0abcd-EXAMPLE-refresh-token";
    const encrypted = encryptToken(original);
    expect(encrypted).not.toBe(original);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it("produces different ciphertext for the same input each time (random IV)", async () => {
    const { encryptToken } = await import("@/lib/calendar/tokenCrypto");
    expect(encryptToken("same-input")).not.toBe(encryptToken("same-input"));
  });

  it("throws on tampered ciphertext instead of silently returning garbage", async () => {
    const { encryptToken, decryptToken } = await import("@/lib/calendar/tokenCrypto");
    const encrypted = encryptToken("secret-value");
    const [iv, tag, data] = encrypted.split(":");
    const tampered = [iv, tag, `${data.slice(0, -4)}abcd`].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws a clear error when the encryption key env var is missing", async () => {
    const { encryptToken } = await import("@/lib/calendar/tokenCrypto");
    const saved = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("x")).toThrow(/CALENDAR_TOKEN_ENCRYPTION_KEY/);
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = saved;
  });
});
