"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState,
  );

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-ctl bg-canvas p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-[12px] py-2 text-sm font-bold transition-colors ${
            isLogin ? "bg-white text-ink" : "text-ink-3"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-[12px] py-2 text-sm font-bold transition-colors ${
            !isLogin ? "bg-white text-ink" : "text-ink-3"
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
            className="mt-1 w-full rounded-ctl border border-black/10 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-violet"
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
            className="mt-1 w-full rounded-ctl border border-black/10 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-violet"
          />
        </label>

        {state?.error && (
          <p
            role="alert"
            className="text-left text-xs font-semibold text-coral"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-ctl bg-ink py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
