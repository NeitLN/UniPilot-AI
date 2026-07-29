import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SidebarNav } from "@/components/dashboard/SidebarNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:flex w-[246px] shrink-0 flex-col bg-ink px-4 py-6">
        <div className="px-1.5 pb-6">
          <Logo tone="light" size={40} />
          <p className="mt-1 text-[11.5px] font-semibold text-[#9C90C4]">
            Semester 253 &middot; week 6
          </p>
        </div>

        <p className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6C5F94]">
          Your space
        </p>
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center gap-3 border-b border-black/5 bg-card px-6 py-4 md:hidden">
          <Logo tone="dark" size={32} />
        </header>

        <main className="flex-1 bg-canvas px-4 py-6 md:px-7 md:py-6">
          {children}
        </main>

        <nav
          className="grid grid-cols-6 gap-1 border-t border-black/5 bg-card px-2 py-2 md:hidden"
          aria-label="Main"
        >
          <Link
            href="/"
            className="rounded-ctl px-1 py-2 text-center text-[10px] font-bold text-ink-2"
          >
            Home
          </Link>
          <Link
            href="/assignments"
            className="rounded-ctl px-1 py-2 text-center text-[10px] font-bold text-ink-2"
          >
            Tasks
          </Link>
          <Link
            href="/planner"
            className="rounded-ctl px-1 py-2 text-center text-[10px] font-bold text-ink-2"
          >
            Plan
          </Link>
          <Link
            href="/schedule"
            className="rounded-ctl px-1 py-2 text-center text-[10px] font-bold text-ink-2"
          >
            Sched
          </Link>
          <Link
            href="/focus"
            className="rounded-ctl px-1 py-2 text-center text-[10px] font-bold text-ink-2"
          >
            Focus
          </Link>
          <Link
            href="/gpa"
            className="rounded-ctl px-1 py-2 text-center text-[10px] font-bold text-ink-2"
          >
            GPA
          </Link>
        </nav>
      </div>
    </div>
  );
}
