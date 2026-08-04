import Link from "next/link";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function FocusCard() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_focus_minutes")
    .maybeSingle();

  // The viewer's own saved default (Settings → Study preferences), not a
  // hardcoded 25 — this dial has to agree with the length /focus will
  // actually start when they press the button. The streak that used to fill
  // this circle now lives where it has room to mean something: the Focus
  // page's "This week" card and the Weekly report.
  const minutes = profile?.default_focus_minutes ?? 25;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-lime p-5">
      <h2 className="font-display text-lg font-bold text-ink">Focus timer</h2>

      <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full bg-ink/10">
        <p className="font-display text-2xl font-bold tabular-nums text-ink">{minutes}:00</p>
      </div>

      <div className="flex min-w-[168px] flex-1 flex-col gap-2">
        <Link
          href="/focus"
          className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-ink py-3 text-sm font-extrabold text-white hover:bg-ink/90"
        >
          Start a session
        </Link>
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-ink/70">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Pomodoro · {minutes} min focus
        </p>
      </div>
    </div>
  );
}

export function FocusCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-wrap items-center justify-between gap-4 rounded-card bg-lime p-5">
      <div className="h-5 w-24 rounded-full bg-ink/10" />
      <div className="h-[104px] w-[104px] shrink-0 rounded-full bg-ink/10" />
      <div className="min-w-[168px] flex-1">
        <div className="h-11 w-full rounded-ctl bg-ink/10" />
      </div>
    </div>
  );
}
