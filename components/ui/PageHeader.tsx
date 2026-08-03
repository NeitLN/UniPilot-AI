/**
 * Shared route header — title, subtitle, and up to two actions. Every
 * redesigned screen in UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md starts
 * with this same shape (see each concept image's top strip); only
 * `AssignmentsPage` predates this primitive and keeps its inline header
 * rather than being churned for its own sake.
 */
export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-semibold text-ink-2">{subtitle}</p>}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
  );
}
