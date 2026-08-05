import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export interface QuickWinItem {
  id: string;
  title: string;
  progress: number;
}

/** Concept §6.6's "Quick wins" — real candidates from `deriveQuickWins`
 * (lib/rules/assignment.ts), ranked by the viewer's own progress field, not
 * a fabricated effort/duration guess. Each row links into a focus session
 * already pointed at that assignment, same deep-link pattern as
 * PiloPickCard's CTA. */
export function AssignmentQuickWins({ items }: { items: QuickWinItem[] }) {
  return (
    <div className="rounded-card-sm bg-card p-4">
      <h2 className="font-display text-base font-bold text-foreground">Quick wins</h2>
      <p className="mt-0.5 text-[11.5px] font-semibold text-ink-3">
        Already mostly done — easy to wrap up.
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/focus?assignment=${item.id}`}
            className="flex items-center gap-2.5 rounded-ctl bg-line px-3 py-2.5 hover:bg-line-hover"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-mint-text" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-foreground">
              {item.title}
            </span>
            <span className="shrink-0 text-[11px] font-bold text-ink-3">
              {Math.round(item.progress)}%
            </span>
            <span aria-hidden="true" className="shrink-0 text-ink-3">
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
