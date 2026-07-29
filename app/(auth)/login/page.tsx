import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-card bg-card p-8 text-center">
        <div className="flex justify-center">
          <Logo tone="dark" size={44} />
        </div>
        <p className="mt-2 mb-6 text-sm font-semibold text-ink-2">
          Personal Student Life OS
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
