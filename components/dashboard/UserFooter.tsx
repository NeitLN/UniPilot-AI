import { logout } from "@/app/(auth)/login/actions";

/** Server-action form, no client JS required — works even if hydration fails. */
export function UserFooter({ email }: { email: string }) {
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-white/10 px-2.5 pt-4">
      <p className="truncate text-[11.5px] font-semibold text-[#9C90C4]">{email}</p>
      <form action={logout}>
        <button
          type="submit"
          className="flex min-h-11 w-full items-center rounded-ctl bg-white/5 px-3.5 py-2.5 text-left text-sm font-semibold text-[#B7ACD8] hover:bg-white/10"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
