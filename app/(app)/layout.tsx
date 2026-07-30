import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { UserFooter } from "@/components/dashboard/UserFooter";
import { SemesterLabel, SemesterLabelSkeleton } from "@/components/dashboard/SemesterLabel";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen w-full">
      {/* A-01: without this, keyboard/screen-reader users had to tab past
          the sidebar's 8 nav links + sign-out + notification bell (11 tabs)
          on every single page just to reach the actual content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <ServiceWorkerRegister />
      <aside className="hidden md:flex w-[246px] shrink-0 flex-col bg-ink px-4 py-6">
        <div className="px-1.5 pb-6">
          <Logo tone="light" size={40} />
          <Suspense
            fallback={<SemesterLabelSkeleton className="mt-1 h-3 w-24 rounded-full bg-white/10" />}
          >
            <SemesterLabel className="mt-1 text-[11.5px] font-semibold text-[#9C90C4]" />
          </Suspense>
        </div>

        <p className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6C5F94]">
          Your space
        </p>
        <SidebarNav />
        {user?.email && <UserFooter email={user.email} />}
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <OfflineBanner />
        <header className="flex items-center justify-between gap-3 border-b border-border-subtle-2 bg-card px-6 py-4 md:hidden">
          <Logo tone="dark" size={32} />
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-line text-foreground hover:bg-[#E6E2F2]"
            >
              <SettingsIcon />
            </Link>
            <Suspense fallback={null}>
              <NotificationBell />
            </Suspense>
          </div>
        </header>

        <div className="hidden items-center justify-end border-b border-border-subtle-2 bg-card px-7 py-3 md:flex">
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 bg-canvas px-4 py-6 pb-24 md:px-7 md:py-6 md:pb-6"
        >
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-8 gap-0.5 border-t border-border-subtle-2 bg-card px-1.5 py-2 md:hidden"
          aria-label="Mobile"
        >
          <Link
            href="/"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            Home
          </Link>
          <Link
            href="/assignments"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            Tasks
          </Link>
          <Link
            href="/planner"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            Plan
          </Link>
          <Link
            href="/schedule"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            Sched
          </Link>
          <Link
            href="/courses"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            Course
          </Link>
          <Link
            href="/focus"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            Focus
          </Link>
          <Link
            href="/gpa"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            GPA
          </Link>
          <Link
            href="/risk"
            className="flex min-h-11 flex-col items-center justify-center rounded-ctl px-0.5 text-center text-[9.5px] font-bold text-ink-2"
          >
            Risk
          </Link>
        </nav>
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19.5a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4.5a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V4.5a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10a1.65 1.65 0 0 0 1.51 1h.09a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
