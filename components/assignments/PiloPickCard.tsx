import Link from "next/link";
import Image from "next/image";

export interface PiloPickAssignment {
  id: string;
  title: string;
  dueAt: string;
}

function relativeDueLabel(dueAt: string, now: Date): string {
  const diffHours = (new Date(dueAt).getTime() - now.getTime()) / 3_600_000;
  if (diffHours < -1) {
    const days = Math.max(1, Math.round(Math.abs(diffHours) / 24));
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  if (diffHours <= 1) return "any moment now";
  if (diffHours < 24) return "today";
  const days = Math.round(diffHours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

/** The right column's "what should I do next" card — `pick` is computed
 * server-side by the pure, unit-tested `pickPiloAssignment` (brief §6.4). */
export function PiloPickCard({
  pick,
  now = new Date(),
}: {
  pick: PiloPickAssignment | null;
  now?: Date;
}) {
  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-start gap-3.5">
        <Image
          src="/mascots/pilo-assignments.png"
          alt=""
          width={110}
          height={110}
          className="h-[86px] w-[86px] shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-lg font-bold">Pilo&rsquo;s pick</h2>
          {pick ? (
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-white/88">
              Start with <span className="font-bold text-white">{pick.title}</span> — it&rsquo;s
              due {relativeDueLabel(pick.dueAt, now)}.
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-white/88">
              All clear — add your next assignment when you&rsquo;re ready.
            </p>
          )}
        </div>
      </div>

      {pick && (
        <Link
          href={`/focus?assignment=${pick.id}`}
          className="mt-4 block w-full rounded-ctl bg-lime py-3 text-center text-sm font-extrabold text-ink hover:bg-lime-deep"
        >
          Focus now
        </Link>
      )}
    </div>
  );
}

export function PiloPickCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-violet p-5">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-2xl bg-white/30" />
        <div className="h-4 w-24 rounded-full bg-white/30" />
      </div>
      <div className="mt-4 h-10 rounded-ctl bg-white/15" />
    </div>
  );
}
