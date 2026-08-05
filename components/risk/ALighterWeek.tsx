import Link from "next/link";

export interface LighterWeekAction {
  icon: React.ReactNode;
  label: string;
  href: string;
}

/** Every row is a real navigation, never a fake checkbox (brief §6.6) —
 * there's no per-task "done" state to check off here, just a destination
 * that actually addresses that part of the score. */
export function ALighterWeek({ actions }: { actions: LighterWeekAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="rounded-card bg-lime p-5">
      <h2 className="font-display text-lg font-bold text-ink">A lighter week</h2>
      <div className="mt-3 flex flex-col gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 rounded-ctl bg-card px-4 py-3 text-sm font-bold text-foreground hover:bg-card/80"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink/15 text-ink-2"
            >
              {a.icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
