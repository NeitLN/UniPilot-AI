"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface ForgotPasswordState {
  ok?: boolean;
  error?: string;
}

async function siteOrigin(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * FR-21 AC-3 (docs/PRODUCT_REVIEW.md): always the same outcome whether or
 * not `email` belongs to a real account — resetPasswordForEmail() already
 * doesn't error for an unregistered address (Supabase's own anti-enumeration
 * behavior), and this action deliberately never adds a separate "does this
 * user exist" lookup that would reintroduce that leak.
 */
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // A rate-limit/network error is fine to surface generically — it says
  // nothing about whether the email is registered, only that the request
  // itself didn't go through.
  if (error) return { error: "Couldn't send the reset email — try again in a moment." };

  return { ok: true };
}
