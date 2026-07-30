/**
 * SR-03 (docs/PRODUCT_REVIEW_3.md): every error/status message across the
 * app used to reach for `text-coral-text` / `text-mint-text` /
 * `text-tangerine-text` standalone — those are fixed dark shades designed
 * to pair with their own light `-tint` background (Tag, KpiCard's solid
 * fills), not to stand alone on `bg-card`/`bg-line`/the page background,
 * which flips dark. Measured ~2.6:1 contrast in dark mode against a 4.5:1
 * AA requirement. `text-coral` (the vivid, theme-fixed accent — same one
 * LoginForm's error text already used correctly) reads fine in both themes
 * standalone. One component instead of ~30 copies of this same class string
 * so the fix can't silently drift back to `-text` in new code.
 */
export function FieldError({
  children,
  className,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  /** "span" for inline use inside a <label>; "p" (default) for a standalone line. */
  as?: "p" | "span";
}) {
  return (
    <Tag role="alert" className={`font-semibold text-coral ${className ?? "text-xs"}`}>
      {children}
    </Tag>
  );
}
