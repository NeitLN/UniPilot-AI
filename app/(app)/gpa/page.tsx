import { Suspense } from "react";
import { GpaContent, GpaContentSkeleton } from "@/components/gpa/GpaContent";

export default function GpaPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          GPA tracker
        </h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">Know where you stand — and where you&rsquo;re headed.</p>
      </div>

      <Suspense fallback={<GpaContentSkeleton />}>
        <GpaContent />
      </Suspense>
    </div>
  );
}
