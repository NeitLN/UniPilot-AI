"use client";

import { useState } from "react";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";

export type AssignmentSectionTone = "attention" | "neutral" | "muted";

const TONE_ICON: Record<AssignmentSectionTone, React.ReactNode> = {
  attention: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  neutral: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
  muted: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
};

const TONE_WRAPPER: Record<AssignmentSectionTone, string> = {
  // Brief §6.3: "coral tint rất nhẹ" for the panel, never a solid coral
  // fill — the individual AssignmentCards inside stay plain bg-card white.
  attention: "rounded-card-sm bg-coral-tint p-3.5",
  neutral: "",
  muted: "",
};

const TONE_HEADING: Record<AssignmentSectionTone, string> = {
  attention: "text-coral-text",
  neutral: "text-foreground",
  muted: "text-ink-2",
};

export function AssignmentSection({
  title,
  tone = "neutral",
  count,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: {
  title: string;
  tone?: AssignmentSectionTone;
  count: number;
  children: React.ReactNode;
  /** "Later" collapses by default when long (brief §6.3). */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  if (count === 0) return null;

  return (
    <div className={TONE_WRAPPER[tone]}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2
          className={`flex items-center gap-2 font-display text-base font-bold ${TONE_HEADING[tone]}`}
        >
          <IconChip
            icon={TONE_ICON[tone]}
            size="sm"
            tone={tone === "attention" ? "coral" : "violet"}
          />
          {title}
          <span className="text-[12px] font-semibold text-ink-3">{count}</span>
        </h2>
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="flex min-h-11 items-center rounded-ctl px-2 text-[12px] font-bold text-ink-3 hover:bg-line"
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        )}
      </div>
      {!collapsed && <div className="mt-2.5 flex flex-col gap-2">{children}</div>}
    </div>
  );
}
