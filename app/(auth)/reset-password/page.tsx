import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-[calc(100vh/var(--app-zoom))] items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-card bg-card p-8 text-center">
        <div className="flex justify-center">
          <Logo tone="dark" size={44} />
        </div>

        {user ? (
          <>
            <h1 className="mt-4 font-display text-lg font-bold text-foreground">
              Set a new password
            </h1>
            <p className="mt-2 mb-6 text-sm font-semibold text-ink-2">
              At least 8 characters.
            </p>
            <ResetPasswordForm />
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-lg font-bold text-foreground">
              This link has expired
            </h1>
            <p className="mt-2 mb-6 text-sm font-semibold text-ink-2">
              Password reset links only work for an hour. Request a new one and try again.
            </p>
            <Link
              href="/forgot-password"
              className="flex min-h-11 items-center justify-center rounded-ctl bg-ink py-2.5 text-sm font-bold text-white"
            >
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
