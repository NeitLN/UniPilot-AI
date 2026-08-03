import Link from "next/link";
import { AddAssignmentButton } from "./AddAssignmentButton";
import type { CourseOption } from "./AssignmentForm";

/** Real, always-available actions only — no fabricated "quick wins" (brief
 * §6.4: there's no effort/duration data to honestly rank tasks by speed).
 * Hidden on mobile by the page (can make the page too long there). */
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
