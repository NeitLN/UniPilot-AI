import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { UserFooter } from "@/components/dashboard/UserFooter";
import { SemesterLabel, SemesterLabelSkeleton } from "@/components/dashboard/SemesterLabel";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { QueueOwnerProvider } from "@/components/offline/QueueOwnerProvider";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // OFF-001: the offline queue must know whose mutations it is holding.
  // `user` is already resolved here, so the id is handed to the client tree
  // once rather than fetched again by each component that queues.
  return (
    <QueueOwnerProvider userId={user?.id ?? ""}>
      <div className="flex min-h-[calc(100vh/var(--app-zoom))] w-full">
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
              fallback={
                <SemesterLabelSkeleton className="mt-1 h-3 w-24 rounded-full bg-white/10" />
              }
            >
              <SemesterLabel className="mt-1 text-[11.5px] font-semibold text-[#9C90C4]" />
            </Suspense>
          </div>

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
                className="flex h-11 w-11 items-center justify-center rounded-full bg-line text-foreground hover:bg-line-hover"
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

          <MobileBottomNav />
        </div>
      </div>
    </QueueOwnerProvider>
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
