import { Logo } from "@/components/brand/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh/var(--app-zoom))] items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-card bg-card p-8 text-center">
        <div className="flex justify-center">
          <Logo tone="dark" size={44} />
        </div>
        <h1 className="mt-4 font-display text-lg font-bold text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 mb-6 text-sm font-semibold text-ink-2">
          Enter the email on your account and we&rsquo;ll send you a reset link.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
