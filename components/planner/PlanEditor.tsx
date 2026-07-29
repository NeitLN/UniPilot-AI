"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPlan,
  cancelPlan,
  deleteStudySession,
  updateStudySession,
} from "@/app/(app)/planner/actions";
import { Pilo } from "@/components/brand/Pilo";

export interface PlanSessionData {
  id: string;
  assignmentTitle: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export function PlanEditor({
  planId,
  sessions,
}: {
  planId: string;
  sessions: PlanSessionData[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function handleConfirm() {
    setActionError(null);
    startTransition(async () => {
      try {
        await confirmPlan(planId);
        router.refresh();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Couldn't confirm the plan.",
        );
      }
    });
  }

  function handleCancel() {
    setActionError(null);
    startTransition(async () => {
      try {
        await cancelPlan(planId);
        router.refresh();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Couldn't cancel the draft.",
        );
      }
    });
  }

  const grouped = groupByDay(sessions);

  return (
    <div className="rounded-card bg-violet p-5 text-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white">
          <Pilo mood="happy" size={34} />
        </span>
        <h2 className="font-display text-lg font-bold">Pilo&rsquo;s plan</h2>
        <span className="ml-auto shrink-0 rounded-pill bg-white/22 px-2.5 py-1 text-[10.5px] font-extrabold">
          Draft
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="mt-3 text-[12.5px] font-medium text-white/88">
          No sessions fit this week — try adjusting your availability, or check
          back after adding assignments.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {grouped.map(([day, daySessions]) => (
            <div key={day}>
              {/* Day label is formatted with the runtime's local timezone —
                  expected to differ between SSR and hydration, not a real mismatch. */}
              <p
                className="text-[11px] font-extrabold uppercase tracking-wide text-white/88"
                suppressHydrationWarning
              >
                {day}
              </p>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {daySessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-[11.5px] font-semibold text-coral-tint">
          {actionError}
        </p>
      )}

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="flex-1 rounded-ctl bg-white/18 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending || sessions.length === 0}
          className="flex-1 rounded-ctl bg-lime py-2.5 text-sm font-bold text-ink disabled:opacity-60"
        >
          {pending ? "Working…" : "Confirm plan"}
        </button>
      </div>
    </div>
  );
}

function groupByDay(sessions: PlanSessionData[]): [string, PlanSessionData[]][] {
  const map = new Map<string, PlanSessionData[]>();
  for (const s of [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    const key = new Date(s.startAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  return Array.from(map.entries());
}

function SessionRow({ session }: { session: PlanSessionData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [startAt, setStartAt] = useState(toLocalInputValue(session.startAt));
  const [endAt, setEndAt] = useState(toLocalInputValue(session.endAt));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateStudySession(
        session.id,
        new Date(startAt).toISOString(),
        new Date(endAt).toISOString(),
      );
      if (!result.ok) {
        setError(result.error ?? "Couldn't save this change.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudySession(session.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't remove this session.");
      }
    });
  }

  if (editing) {
    return (
      <div className="rounded-ctl bg-white/12 p-3">
        <p className="text-[12.5px] font-bold">{session.assignmentTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="rounded-[10px] border border-white/25 bg-white/10 px-2 py-1.5 text-[12px] text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="rounded-[10px] border border-white/25 bg-white/10 px-2 py-1.5 text-[12px] text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
        </div>
        {error && (
          <p role="alert" className="mt-1.5 text-[11px] font-semibold text-coral-tint">
            {error}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-ctl bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-ctl bg-lime px-3 py-1.5 text-[11px] font-bold text-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-ctl bg-white/12 px-3 py-2.5 sm:flex-row sm:items-center">
      {/* Formatted in the runtime's local timezone — expected to differ
          between SSR and hydration, not a real mismatch. */}
      <div
        className="w-[112px] shrink-0 font-display text-[13.5px] font-bold"
        suppressHydrationWarning
      >
        {new Date(session.startAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
        {"–"}
        {new Date(session.endAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{session.assignmentTitle}</p>
        {session.reason && (
          <p className="truncate text-[11px] font-medium text-[#C9B9FF]">{session.reason}</p>
        )}
        {error && (
          <p role="alert" className="text-[11px] font-semibold text-coral-tint">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-ctl bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-ctl bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
