export function SettingsSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-card bg-card p-5 ${className ?? ""}`}>
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-[12.5px] font-semibold text-ink-3">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
