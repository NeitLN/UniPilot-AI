"use client";

import { useActionState } from "react";
import { updatePassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-left text-xs font-bold text-ink-2">
        New password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-ctl border border-border-subtle px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-violet"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-left text-xs font-semibold text-coral">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex min-h-11 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
