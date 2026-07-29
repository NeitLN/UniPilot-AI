import Link from "next/link";
import { Pilo } from "@/components/brand/Pilo";
import { Tag } from "@/components/ui/Tag";
import { overdueLabel, priorityLabel, statusLabel } from "@/lib/rules/assignment";
import type { AssignmentPriority, AssignmentStatus } from "@/lib/supabase/types";

export interface SummaryAssignment {
  id: string;
  title: string;
  courseName: string | null;
  dueAt: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  archivedAt: string | null;
}

export function AssignmentSummaryCard({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: SummaryAssignment[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-card bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <Link
          href="/assignments"
          className="text-[12.5px] font-extrabold text-violet hover:underline"
        >
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Pilo mood="sleepy" size={56} />
          <p className="text-[12.5px] font-semibold text-ink-2">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="mt-1">
          {items.map((a) => {
            const overdue = overdueLabel(a);
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 border-t border-line py-[11px] first:border-t-0 first:pt-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{a.title}</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-semibold text-ink-3">
                    {a.courseName ?? "No course"} ·{" "}
                    {new Date(a.dueAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {overdue ? (
                  <Tag tone="coral">{overdue}</Tag>
                ) : a.priority === "high" ? (
                  <Tag tone="tangerine">{priorityLabel(a)}</Tag>
                ) : (
                  <Tag tone="neutral">{statusLabel(a)}</Tag>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AssignmentSummarySkeleton({ title }: { title: string }) {
  return (
    <div className="animate-pulse rounded-card bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-ctl bg-line" />
        ))}
      </div>
    </div>
  );
}
