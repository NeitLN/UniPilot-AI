import { Suspense } from "react";
import { GpaContent, GpaContentSkeleton } from "@/components/gpa/GpaContent";

export default function GpaPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="font-display text-3xl font-semibold text-ink">
        GPA tracker
      </h1>

      <Suspense fallback={<GpaContentSkeleton />}>
        <GpaContent />
      </Suspense>
    </div>
  );
}
