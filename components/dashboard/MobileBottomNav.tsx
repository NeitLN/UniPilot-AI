"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

// D-04 (docs/UIUX_REVIEW.md): labels now mirror SidebarNav's wording
// wherever the two previously disagreed ("Tasks" here vs "Assignments"
// there was the confusion a test user actually hit) — kept short for the
// 8-column grid, but no longer a different word for the same destination.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/assignments", label: "Assign." },
  { href: "/planner", label: "Plan" },
  { href: "/schedule", label: "Sched" },
  { href: "/courses", label: "Course" },
  { href: "/focus", label: "Focus" },
  { href: "/gpa", label: "GPA" },
  { href: "/risk", label: "Risk" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-8 gap-0.5 border-t border-border-subtle-2 bg-card px-1.5 py-2 md:hidden"
      aria-label="Mobile"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[11px] font-bold transition-colors ${
              isActive ? "bg-lime text-ink font-extrabold" : "text-ink-2"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
