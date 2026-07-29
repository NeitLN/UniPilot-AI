/** Mock shell — the real Pomodoro timer lands in Phase 5 (lib/rules/focus.ts, BR-04). */
export function FocusCard() {
  return (
    <div className="rounded-card bg-lime p-5 text-center">
      <div className="mx-auto flex h-[150px] w-[150px] items-center justify-center rounded-full bg-ink/10">
        <p className="font-display text-4xl font-bold text-ink">25:00</p>
      </div>
      <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink/60">
        Focus timer
      </p>
      <button
        type="button"
        disabled
        className="mt-4 w-full rounded-ctl bg-ink py-3 text-sm font-extrabold text-white opacity-45"
      >
        Start
      </button>
      <p className="mt-2 text-[11.5px] font-semibold text-ink/70">
        Pomodoro sessions land in Phase 5.
      </p>
    </div>
  );
}
