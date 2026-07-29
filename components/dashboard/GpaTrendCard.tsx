/** Mock shell — GPA calculation and trend chart land in Phase 6 (lib/rules/gpa.ts, BR-05). */
export function GpaTrendCard() {
  return (
    <div className="rounded-card bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">GPA trend</h2>
      <p className="mt-2 text-[12.5px] font-semibold text-ink-2">
        Enter grades to see your semester trend — lands in Phase 6.
      </p>
    </div>
  );
}
