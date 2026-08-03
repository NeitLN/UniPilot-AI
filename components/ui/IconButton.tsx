/** 44x44 icon-only button — always carries an aria-label since the icon
 * alone is never sufficient (brief §5.4). Used for "…" menus, small
 * inline actions (edit/close) across the redesigned screens. */
export function IconButton({
  icon,
  label,
  onClick,
  type = "button",
  tone = "neutral",
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  tone?: "neutral" | "danger";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-ctl bg-line text-ink-2 hover:bg-line-hover ${
        tone === "danger" ? "hover:bg-coral-tint hover:text-coral-text" : ""
      } ${className ?? ""}`}
    >
      {icon}
    </button>
  );
}
