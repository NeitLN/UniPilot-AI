import { Pilo } from "@/components/brand/Pilo";

/**
 * Mock shell — AI plan generation lands in Phase 7. The Draft badge and
 * disabled Confirm button already reflect BR-02 (a draft never auto-activates).
 */
export function PlanCard() {
  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
          <Pilo mood="happy" size={34} />
        </span>
        <h2 className="font-display text-lg font-bold">Pilo&rsquo;s plan</h2>
        <span className="ml-auto shrink-0 rounded-pill bg-white/22 px-2.5 py-1 text-[10.5px] font-extrabold">
          Draft
        </span>
      </div>
      <p className="mt-3 text-[11.5px] font-medium leading-relaxed text-[#C9B9FF]">
        AI-generated weekly study plans land in Phase 7 — nothing is
        scheduled yet.
      </p>
      <button
        type="button"
        disabled
        className="mt-4 w-full rounded-ctl bg-lime py-3 text-sm font-extrabold text-ink opacity-60"
      >
        Confirm plan
      </button>
    </div>
  );
}
