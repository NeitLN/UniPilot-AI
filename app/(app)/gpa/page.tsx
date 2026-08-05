import { Suspense } from "react";
import { AddGradeAction, GpaContent, GpaContentSkeleton } from "@/components/gpa/GpaContent";

export default function GpaPage() {
  return (
    <div className="flex flex-col gap-3.5">
      {/* Title and action share a row, per the concept. The action is
          suspended on its own so the heading paints immediately. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">GPA tracker</h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            Know where you stand — and where you&rsquo;re headed.
          </p>
        </div>
        <Suspense fallback={<div className="h-11 w-32 animate-pulse rounded-pill bg-ink/10" />}>
          <AddGradeAction />
        </Suspense>
      </div>

      <Suspense fallback={<GpaContentSkeleton />}>
        <GpaContent />
      </Suspense>
    </div>
  );
}
