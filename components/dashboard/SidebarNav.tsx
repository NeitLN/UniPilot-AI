"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutGrid,
  ClipboardList,
  Sparkles,
  CalendarDays,
  BookOpen,
  Clock,
  LineChart,
  AlertTriangle,
  FileBarChart,
  Settings as SettingsIcon,
} from "lucide-react";
import { DURATION, EASING } from "@/lib/motion/tokens";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/planner", label: "AI planner", icon: Sparkles },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/focus", label: "Focus timer", icon: Clock },
  { href: "/gpa", label: "GPA tracker", icon: LineChart },
  { href: "/risk", label: "Workload risk", icon: AlertTriangle },
  { href: "/reports", label: "Weekly report", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
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
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-h-11 items-center gap-2.5 rounded-ctl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
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
            <Icon className="relative h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
