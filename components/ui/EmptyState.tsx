import Link from "next/link";
import { Pilo, type PiloMood } from "@/components/brand/Pilo";
import { FadeIn } from "@/components/motion/FadeIn";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

/** Shared empty state — Pilo is optional (brief §5.3: not on every card,
 * only guidance/encouragement/feedback points). CTA is always a real
 * destination or handler, never decorative. */
export function EmptyState({
  pilo,
  heading,
  copy,
  action,
  className,
}: {
  pilo?: PiloMood | false;
  heading: string;
  copy: string;
  action?: EmptyStateAction;
  className?: string;
}) {
  return (
    <FadeIn className={`flex flex-col items-center gap-3 rounded-card-sm bg-card py-10 text-center ${className ?? ""}`}>
      {pilo && <Pilo mood={pilo} size={64} />}
      <div>
        <p className="font-display text-base font-bold text-foreground">{heading}</p>
        <p className="mt-1 max-w-xs text-sm font-semibold text-ink-2">{copy}</p>
      </div>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="flex min-h-11 items-center rounded-ctl bg-violet px-4 text-sm font-bold text-white hover:bg-violet-deep"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="flex min-h-11 items-center rounded-ctl bg-violet px-4 text-sm font-bold text-white hover:bg-violet-deep"
          >
            {action.label}
          </button>
        ))}
    </FadeIn>
  );
}
