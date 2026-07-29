// Encrypts the Google refresh token before it's stored in Postgres, so a
// leaked service-role key or a stray RLS gap doesn't hand out a live
// long-lived credential to the user's real Google Calendar. AES-256-GCM
// with a random IV per call; auth tag makes tampering fail loudly instead
// of decrypting to garbage.
//
// No "server-only" import here (unlike the other secret-touching lib files):
// it breaks Vitest for any file that imports it, and this module already
// can't run in a browser bundle regardless — it imports node:crypto, which
// has no client-side polyfill and would fail the build immediately.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_SALT = "unipilot-calendar-token-v1";

function getKey(): Buffer {
  const secret = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("Missing required env var: CALENDAR_TOKEN_ENCRYPTION_KEY");
  }
  return scryptSync(secret, KEY_SALT, 32);
}

/** Stored format: base64(iv):base64(authTag):base64(ciphertext) */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decryptToken(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted token");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
