"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pilo } from "@/components/brand/Pilo";
import { Modal } from "@/components/ui/Modal";
import { logFocusSession } from "@/app/(app)/focus/actions";
import { POMODORO_SECONDS } from "@/lib/rules/focus";

const STORAGE_KEY = "unipilot:focus:session";
const RADIUS = 65;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface FocusAssignmentOption {
  id: string;
  title: string;
}

interface StoredSession {
  assignmentId: string;
  startedAt: string;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.assignmentId || !parsed.startedAt) return null;
    return { assignmentId: parsed.assignmentId, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function FocusTimer({ assignments }: { assignments: FocusAssignmentOption[] }) {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [selectedId, setSelectedId] = useState(assignments[0]?.id ?? "");
  const [remaining, setRemaining] = useState(POMODORO_SECONDS);
  const [justCompleted, setJustCompleted] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [pending, setPending] = useState(false);
  const finishedRef = useRef(false);

  // Resume an in-flight session after a reload. localStorage isn't available
  // during SSR, so the very first client render still shows the picker —
  // this effect corrects that immediately post-mount instead of guessing at
  // browser-only state during render (which would risk a hydration mismatch).
  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external store (localStorage) on mount
      setSession(stored);
      setSelectedId(stored.assignmentId);
    }
  }, []);

  async function complete() {
    if (!session) return;
    setPending(true);
    await logFocusSession({
      assignmentId: session.assignmentId,
      startedAt: session.startedAt,
      endedAt: new Date().toISOString(),
    });
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setJustCompleted(true);
    setPending(false);
    router.refresh();
  }

  useEffect(() => {
    if (!session) return;
    finishedRef.current = false;

    function tick() {
      const elapsed = (Date.now() - new Date(session!.startedAt).getTime()) / 1000;
      const left = POMODORO_SECONDS - elapsed;
      setRemaining(left);
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        void complete();
      }
    }

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function handleStart() {
    if (!selectedId) return;
    const startedAt = new Date().toISOString();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ assignmentId: selectedId, startedAt }),
    );
    setJustCompleted(false);
    setSession({ assignmentId: selectedId, startedAt });
  }

  async function confirmStopEarly() {
    if (!session) return;
    setPending(true);
    await logFocusSession({
      assignmentId: session.assignmentId,
      startedAt: session.startedAt,
      endedAt: new Date().toISOString(),
    });
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setConfirmingStop(false);
    setPending(false);
    router.refresh();
  }

  const isRunning = session !== null;
  const displaySeconds = isRunning ? remaining : POMODORO_SECONDS;
  const progress = Math.max(0, Math.min(1, displaySeconds / POMODORO_SECONDS));
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const activeAssignment = assignments.find(
    (a) => a.id === (session?.assignmentId ?? selectedId),
  );

  return (
    <div className="rounded-card bg-lime p-5 text-center">
      {!isRunning && (
        <label className="mb-3 block text-left text-xs font-bold text-ink/70">
          Assignment
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={assignments.length === 0}
            className="mt-1 w-full rounded-ctl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60"
          >
            {assignments.length === 0 ? (
              <option value="">No active assignments</option>
            ) : (
              assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))
            )}
          </select>
        </label>
      )}

      {isRunning && activeAssignment && (
        <p className="mb-2 truncate text-[12.5px] font-bold text-ink/70">
          {activeAssignment.title}
        </p>
      )}

      <div className="relative mx-auto flex h-[150px] w-[150px] items-center justify-center">
        <svg viewBox="0 0 150 150" className="absolute inset-0 -rotate-90">
          <circle cx="75" cy="75" r={RADIUS} fill="none" strokeWidth="12" className="stroke-ink/15" />
          <circle
            cx="75"
            cy="75"
            r={RADIUS}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-ink motion-safe:transition-[stroke-dashoffset] motion-safe:duration-200 motion-safe:ease-linear"
          />
        </svg>
        <p className="font-display text-4xl font-bold text-ink tabular-nums">
          {formatClock(displaySeconds)}
        </p>
      </div>

      <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink/60">
        Focus timer
      </p>

      {isRunning ? (
        <button
          type="button"
          onClick={() => setConfirmingStop(true)}
          disabled={pending}
          className="mt-4 w-full rounded-ctl bg-ink py-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          Stop
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={handleStart}
            disabled={!selectedId}
            className="mt-4 w-full rounded-ctl bg-ink py-3 text-sm font-extrabold text-white disabled:opacity-45"
          >
            Start
          </button>
          {!selectedId && (
            <p className="mt-2 text-[11.5px] font-semibold text-ink/70">
              {assignments.length === 0
                ? "Add an assignment first — Pomodoro needs one to log against."
                : "Pick an assignment first."}
            </p>
          )}
        </>
      )}

      {justCompleted && !isRunning && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
            <Pilo mood="happy" size={24} />
          </span>
          <p className="text-[12.5px] font-bold text-ink">Nice work — cycle logged.</p>
        </div>
      )}

      <Modal
        open={confirmingStop}
        onClose={() => setConfirmingStop(false)}
        title="Stop focus session"
      >
        <h2 className="font-display text-lg font-bold text-ink">Stop this session?</h2>
        <p className="mt-2 text-sm font-semibold text-ink-2">
          {`This logs a partial session for ${formatClock(POMODORO_SECONDS - remaining)} — it won't count toward your streak.`}
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmingStop(false)}
            className="flex-1 rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={confirmStopEarly}
            disabled={pending}
            className="flex-1 rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
          >
            {pending ? "Stopping…" : "Stop"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
