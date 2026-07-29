import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Pilo } from "@/components/brand/Pilo";

/** Shows only for a genuinely new account (no course yet — the one thing
 * every other module depends on) — points at the 3-step /onboarding wizard
 * instead of leaving a first-time user to discover Schedule → Add course on
 * their own (NFR-04). */
export async function WelcomeBanner() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-violet p-6 text-center text-white sm:flex-row sm:text-left">
      <Pilo mood="happy" size={56} />
      <div className="flex-1">
        <h2 className="font-display text-lg font-bold">Welcome to UniPilot AI</h2>
        <p className="mt-0.5 text-[12.5px] font-medium text-white/85">
          Set your availability, add a course, and log your first assignment —
          three steps, about a minute.
        </p>
      </div>
      <Link
        href="/onboarding"
        className="flex min-h-11 w-full shrink-0 items-center justify-center rounded-ctl bg-lime px-5 text-sm font-extrabold text-ink hover:bg-lime-deep sm:w-auto"
      >
        Get started
      </Link>
    </div>
  );
}
