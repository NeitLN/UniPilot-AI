/** Same rationale as FieldError (components/ui/FieldError.tsx, D-03 in
 * docs/UIUX_REVIEW.md): `text-mint` standalone measured 1.76:1 on bg-card in
 * light mode — the worst contrast found anywhere in the app — because
 * `--mint` is a mid-brightness accent, not designed to stand alone as text.
 * `--mint-tint`/`--mint-text` are theme-invariant (always light bg + always
 * dark text), so pairing them sidesteps the light/dark flip instead of
 * chasing a single shade that survives both themes. */
export function FieldSuccess({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={`inline-block rounded-pill bg-mint-tint px-2 py-0.5 font-semibold text-mint-text ${className ?? "text-xs"}`}
    >
      {children}
    </p>
  );
}
