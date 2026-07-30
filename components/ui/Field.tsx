import { FieldError } from "./FieldError";

/**
 * TD4-01 (docs/PRODUCT_REVIEW_4.md) — `Field` was defined identically
 * (byte-for-byte) in 5 form files, and `inputClass` in 7 — copy-paste, not
 * intentional divergence, confirmed by diffing every copy before touching
 * any of them. One shared version instead. `extra` exists only because
 * EventForm's inputs sit in flex rows and needed `min-w-0` to keep long
 * text (e.g. "AM/PM") from forcing an overflow — every other caller omits it.
 */
export function inputClass(hasError: boolean, extra?: string): string {
  return `w-full rounded-ctl border px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet ${
    hasError ? "border-coral" : "border-border-subtle focus:border-violet"
  } ${extra ?? ""}`;
}

export interface FieldProps {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, error, className, children }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-bold text-ink-2 ${className ?? ""}`}>
      {label}
      {children}
      {error && (
        <FieldError as="span" className="text-[11px]">
          {error}
        </FieldError>
      )}
    </label>
  );
}
