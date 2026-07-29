"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/assignments", label: "Assignments" },
  { href: "/planner", label: "AI planner" },
  { href: "/schedule", label: "Schedule" },
  { href: "/focus", label: "Focus timer" },
  { href: "/gpa", label: "GPA tracker" },
  { href: "/risk", label: "Workload risk" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-ctl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-lime text-ink font-extrabold"
                : "text-[#B7ACD8] hover:bg-white/5"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
