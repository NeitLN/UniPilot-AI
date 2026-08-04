import { Logo } from "@/components/brand/Logo";
import { FieldSuccess } from "@/components/ui/FieldSuccess";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  return (
    <div className="flex min-h-[calc(100vh/var(--app-zoom))] items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-card bg-card p-8 text-center">
        <div className="flex justify-center">
          <Logo tone="dark" size={44} />
        </div>
        <p className="mt-2 mb-6 text-sm font-semibold text-ink-2">
          Personal Student Life OS
        </p>
        {/* FR-27: neutral wording, consistent with AC-3 on the password
            reset flow — doesn't confirm which account existed or was
            deleted, just that the action completed. */}
        {deleted && (
          <FieldSuccess className="mb-6 text-sm">
            Account deleted. Thanks for using UniPilot AI.
          </FieldSuccess>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
