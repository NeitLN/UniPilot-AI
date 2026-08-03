"use client";

import { useEffect, useRef, useState } from "react";

const ITEMS = [
  { id: "profile", label: "Profile" },
  { id: "study-preferences", label: "Study preferences" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
  { id: "connections", label: "Connections" },
  { id: "data-privacy", label: "Data & privacy" },
];

/** Step 8.1 — internal nav with a real scroll-spy (IntersectionObserver),
 * not a decorative list: `active` tracks whichever section is actually
 * intersecting the viewport as the user scrolls, and clicking an item both
 * scrolls to and focuses that section so keyboard/AT users land somewhere
 * meaningful, not just a visual jump. */
export function SettingsNav() {
  const [active, setActive] = useState(ITEMS[0].id);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function goTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    setActive(id);
  }

  return (
    <>
      {/* Desktop: vertical nav, sticky in the 25% rail. */}
      <nav
        aria-label="Settings sections"
        className="sticky top-4 hidden flex-col gap-1 md:flex"
      >
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(item.id)}
            aria-current={active === item.id ? "true" : undefined}
            className={`flex min-h-11 items-center rounded-ctl px-3.5 text-left text-sm font-bold transition-colors ${
              active === item.id
                ? "bg-violet text-white"
                : "text-ink-2 hover:bg-line"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Mobile: horizontal scrolling tabs. */}
      <nav
        ref={listRef}
        aria-label="Settings sections"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:hidden"
      >
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(item.id)}
            aria-current={active === item.id ? "true" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-pill px-3.5 text-sm font-bold transition-colors ${
              active === item.id
                ? "bg-violet text-white"
                : "bg-line text-ink-2 hover:bg-line-hover"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
