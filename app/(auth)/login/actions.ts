"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  /** Not a failure — the request worked but did not produce a session, so
   * there is something for the user to do next rather than a mistake to fix. */
  notice?: string;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter both email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter both email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // signUp succeeding does not mean the user is signed in. Two cases return
  // no error and no session: the project requires email confirmation, and —
  // deliberately — the address already has an account, which Supabase answers
  // identically so the form cannot be used to discover who is registered
  // (`identities: []`, verified against the live project).
  //
  // Redirecting anyway sent both straight to "/", where the proxy found no
  // session and bounced them back to the login form with nothing said. The
  // student saw the page they had just submitted and no reason why.
  //
  // One message for both cases, because telling them apart is exactly the
  // enumeration leak Supabase is avoiding.
  if (!data.session) {
    return {
      notice:
        "Check your email to confirm your account. If you already have one, sign in instead.",
    };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
