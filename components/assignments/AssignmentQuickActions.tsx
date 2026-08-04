import Link from "next/link";
import { AddAssignmentButton } from "./AddAssignmentButton";
import type { CourseOption } from "./AssignmentForm";

/** Fallback for the right rail's third card when no assignment qualifies as
 * a real "quick win" (see AssignmentQuickWins.tsx / deriveQuickWins) — real,
 * always-available navigation shortcuts rather than an empty card. Hidden
 * on mobile by the page (can make the page too long there). */
export function AssignmentQuickActions({ courses }: { courses: CourseOption[] }) {
  return (
    <div className="rounded-card-sm bg-card p-4">
      <h2 className="font-display text-base font-bold text-foreground">Quick actions</h2>
      <div className="mt-3 flex flex-col gap-2">
        <AddAssignmentButton courses={courses} variant="block" />
        <Link
          href="/focus"
          className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-line px-4 py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
        >
          Start focus session
        </Link>
        <Link
          href="/planner"
          className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-line px-4 py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
        >
          Open AI planner
        </Link>
      </div>
    </div>
  );
}
