"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FieldError } from "@/components/ui/FieldError";
import { FieldSuccess } from "@/components/ui/FieldSuccess";
import { login, signup, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(login, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signup, initialState);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-ctl bg-canvas p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-[12px] py-2 text-sm font-bold transition-colors ${
            isLogin ? "bg-card text-foreground" : "text-ink-3"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-[12px] py-2 text-sm font-bold transition-colors ${
            !isLogin ? "bg-card text-foreground" : "text-ink-3"
          }`}
        >
          Sign up
        </button>
      </div>

      <form
        key={mode}
        action={isLogin ? loginAction : signupAction}
        className="flex flex-col gap-3"
      >
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

        <label className="text-left text-xs font-bold text-ink-2">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="mt-1 w-full rounded-ctl border border-border-subtle px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-violet"
          />
        </label>

        {isLogin && (
          <Link
            href="/forgot-password"
            className="-mt-1 self-end text-xs font-bold text-violet-text hover:underline"
          >
            Forgot password?
          </Link>
        )}

        {state?.error && <FieldError className="text-left text-xs">{state.error}</FieldError>}
        {/* Sign-up can succeed without signing anyone in — email confirmation
            pending, or the address already has an account. Both used to
            redirect and bounce silently back to this form. */}
        {state?.notice && <FieldSuccess className="text-left text-xs">{state.notice}</FieldSuccess>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 flex min-h-11 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
