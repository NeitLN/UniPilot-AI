"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FieldError } from "@/components/ui/FieldError";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.ok) {
    return (
      <div className="text-center">
        <p className="text-sm font-semibold text-ink-2">
          If that email has an account, we&rsquo;ve sent a link to reset the password. It expires in
          an hour.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-xs font-bold text-violet-text hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-left text-xs font-bold text-ink-2">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-ctl border border-border-subtle px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-violet"
        />
      </label>

      {state.error && <FieldError className="text-left text-xs">{state.error}</FieldError>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex min-h-11 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>

      <Link href="/login" className="text-xs font-bold text-ink-3 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
