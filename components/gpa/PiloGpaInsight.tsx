import Image from "next/image";
import type { GpaInsight } from "@/lib/rules/gpa";

/** `insight` comes from the pure `strongestCourseInsight` — null means
 * there's no real signal to report yet, so the card doesn't render at all
 * rather than showing a hedge (brief §5.5). */
export function PiloGpaInsight({ insight }: { insight: GpaInsight | null }) {
  if (!insight) return null;

  return (
    <div className="flex items-center gap-4 rounded-card bg-card p-5">
      <Image
        src="/mascots/pilo-gpa-tracker.png"
        alt=""
        width={110}
        height={110}
        className="h-[110px] w-[110px] shrink-0 object-contain"
      />
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-violet-text">Pilo insight</h2>
        <p className="mt-1 text-[13px] font-semibold text-ink-2">
          Your strongest {insight.basis === "official" ? "current" : "predicted"} course is{" "}
          <span className="font-bold text-foreground">{insight.courseName}</span>. Keep it up!
        </p>
      </div>
    </div>
  );
}
