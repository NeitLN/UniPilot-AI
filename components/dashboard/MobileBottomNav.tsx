"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { DURATION, EASING } from "@/lib/motion/tokens";

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
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className="relative flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[11px] font-bold"
          >
            {/* A single shared layoutId slides this highlight between tabs
                instead of each tab independently popping its own bg-lime
                in/out — a tween (not Motion's default spring) keeps it a
                calm settle-into-place, never a bounce. motion-reduce
                readers still get the instant class-based fallback since
                MotionConfig(reducedMotion="user") disables the layout
                animation itself, leaving just the color/opacity end state. */}
            {isActive && (
              <motion.div
                layoutId="mobile-nav-active"
                transition={{
                  duration: DURATION.standard,
                  ease: EASING.standard,
                }}
                className="absolute inset-0 rounded-ctl bg-lime"
              />
            )}
            <span
              className={`relative transition-colors duration-150 ${
                isActive ? "font-extrabold text-ink" : "text-ink-2"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
