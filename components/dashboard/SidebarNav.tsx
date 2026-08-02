"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { DURATION, EASING } from "@/lib/motion/tokens";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/assignments", label: "Assignments" },
  { href: "/planner", label: "AI planner" },
  { href: "/schedule", label: "Schedule" },
  { href: "/courses", label: "Courses" },
  { href: "/focus", label: "Focus timer" },
  { href: "/gpa", label: "GPA tracker" },
  { href: "/risk", label: "Workload risk" },
  { href: "/reports", label: "Weekly report" },
  { href: "/settings", label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Sidebar">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-h-11 items-center rounded-ctl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? "text-ink font-extrabold"
                : "text-[#B7ACD8] hover:bg-white/5"
            }`}
          >
            {/* Same shared layoutId/tween approach as MobileBottomNav — one
                highlight sliding between rows instead of each row popping
                its own background in and out. */}
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                transition={{
                  duration: DURATION.standard,
                  ease: EASING.standard,
                }}
                className="absolute inset-0 rounded-ctl bg-lime"
              />
            )}
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
