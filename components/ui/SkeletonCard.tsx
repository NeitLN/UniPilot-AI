/** Generic pulse skeleton block — `.animate-pulse` is disabled under
 * `prefers-reduced-motion: reduce` globally (see app/globals.css), so this
 * needs no extra guard of its own. */
export function SkeletonCard({
  className,
  rounded = "rounded-card",
}: {
  className?: string;
  rounded?: "rounded-card" | "rounded-card-sm" | "rounded-ctl";
}) {
  return <div className={`animate-pulse bg-line ${rounded} ${className ?? "h-24 w-full"}`} />;
}
