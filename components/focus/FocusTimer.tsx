"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pilo } from "@/components/brand/Pilo";
import { Modal } from "@/components/ui/Modal";
import { logFocusSession } from "@/app/(app)/focus/actions";
import {
  breakKindForCycle,
  LONG_BREAK_SECONDS,
  POMODORO_SECONDS,
  SHORT_BREAK_SECONDS,
} from "@/lib/rules/focus";
import { enqueueMutation } from "@/lib/offline/idb";

const STORAGE_KEY = "unipilot:focus:session";
const CYCLE_COUNT_KEY = "unipilot:focus:cycleCount";
const RADIUS = 65;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface FocusAssignmentOption {
  id: string;
  title: string;
}

type Phase = "work" | "break";
type BreakKind = "short" | "long";

interface StoredSession {
  assignmentId: string;
  startedAt: string;
  phase: Phase;
  breakKind?: BreakKind;
  /** Set while paused; timer freezes at the remaining time it had then. */
  pausedAt: string | null;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.assignmentId || !parsed.startedAt || !parsed.phase) return null;
    return {
      assignmentId: parsed.assignmentId,
      startedAt: parsed.startedAt,
      phase: parsed.phase,
      breakKind: parsed.breakKind,
      pausedAt: parsed.pausedAt ?? null,
    };
  } catch {
    return null;
  }
}

function readCycleCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(CYCLE_COUNT_KEY) ?? "0") || 0;
}

function phaseDuration(session: Pick<StoredSession, "phase" | "breakKind">): number {
  if (session.phase === "work") return POMODORO_SECONDS;
  return session.breakKind === "long" ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
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
  const [finishedPhase, setFinishedPhase] = useState<Phase | null>(null);
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

  function persist(next: StoredSession | null) {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSession(next);
  }

  // Only a WORK phase reaching a full 25:00 (auto-timeout or the ordinary
  // finish path) logs anything to the server — breaks are pure local timer
  // state, never sent as a focus_sessions row.
  async function finishWorkSession(current: StoredSession) {
    setPending(true);
    const input = {
      assignmentId: current.assignmentId,
      startedAt: current.startedAt,
      endedAt: new Date().toISOString(),
    };
    if (navigator.onLine) {
      await logFocusSession(input);
    } else {
      // No network to reach the server action — queue it so the completed
      // cycle isn't lost, synced the moment the browser comes back online.
      await enqueueMutation("logFocusSession", input);
    }
    setPending(false);
    router.refresh();
  }

  /** Work phase hit 0:00 on its own — earns a break instead of just ending. */
  async function completeWork() {
    if (!session) return;
    await finishWorkSession(session);
    const nextCycle = readCycleCount() + 1;
    window.localStorage.setItem(CYCLE_COUNT_KEY, String(nextCycle));
    persist({
      assignmentId: session.assignmentId,
      startedAt: new Date().toISOString(),
      phase: "break",
      breakKind: breakKindForCycle(nextCycle),
      pausedAt: null,
    });
    setFinishedPhase("work");
  }

  function completeBreak() {
    persist(null);
    setFinishedPhase("break");
  }

  useEffect(() => {
    if (!session || session.pausedAt) return;
    finishedRef.current = false;

    function tick() {
      const duration = phaseDuration(session!);
      const elapsed = (Date.now() - new Date(session!.startedAt).getTime()) / 1000;
      const left = duration - elapsed;
      setRemaining(left);
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        if (session!.phase === "work") void completeWork();
        else completeBreak();
      }
    }

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function handleStart() {
    if (!selectedId) return;
    setFinishedPhase(null);
    persist({
      assignmentId: selectedId,
      startedAt: new Date().toISOString(),
      phase: "work",
      pausedAt: null,
    });
  }

  function handlePauseToggle() {
    if (!session) return;
    if (session.pausedAt) {
      // Resuming: shift startedAt forward by however long the pause
      // lasted, so elapsed-time math never counts the paused interval.
      const pauseDurationMs = Date.now() - new Date(session.pausedAt).getTime();
      persist({
        ...session,
        startedAt: new Date(
          new Date(session.startedAt).getTime() + pauseDurationMs,
        ).toISOString(),
        pausedAt: null,
      });
    } else {
      persist({ ...session, pausedAt: new Date().toISOString() });
    }
  }

  async function confirmStopEarly() {
    if (!session) return;
    if (session.phase === "work") {
      await finishWorkSession(session);
    }
    persist(null);
    setConfirmingStop(false);
  }

  function skipBreak() {
    persist(null);
    setFinishedPhase(null);
  }

  const isRunning = session !== null;
  const isPaused = Boolean(session?.pausedAt);
  const isBreak = session?.phase === "break";
  const duration = session ? phaseDuration(session) : POMODORO_SECONDS;
  const displayRemaining = session
    ? session.pausedAt
      ? duration -
        (new Date(session.pausedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
      : remaining
    : POMODORO_SECONDS;
  const progress = Math.max(0, Math.min(1, displayRemaining / duration));
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const activeAssignment = assignments.find(
    (a) => a.id === (session?.assignmentId ?? selectedId),
  );

  return (
    <div className={`rounded-card p-5 text-center ${isBreak ? "bg-mint" : "bg-lime"}`}>
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

      {isRunning && isBreak && (
        <p className="mb-2 text-[12.5px] font-bold text-ink/70">
          {session.breakKind === "long" ? "Long break" : "Short break"} — nice work
          on {activeAssignment?.title ?? "that cycle"}
        </p>
      )}
      {isRunning && !isBreak && activeAssignment && (
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
          {formatClock(displayRemaining)}
        </p>
      </div>

      <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink/60">
        {isBreak ? "Break" : "Focus timer"}
        {isPaused ? " · Paused" : ""}
      </p>

      {isRunning ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handlePauseToggle}
            disabled={pending}
            className="flex-1 rounded-ctl bg-white py-3 text-sm font-extrabold text-ink disabled:opacity-60"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          {isBreak ? (
            <button
              type="button"
              onClick={skipBreak}
              className="flex-1 rounded-ctl bg-ink py-3 text-sm font-extrabold text-white"
            >
              Skip break
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingStop(true)}
              disabled={pending}
              className="flex-1 rounded-ctl bg-ink py-3 text-sm font-extrabold text-white disabled:opacity-60"
            >
              Stop
            </button>
          )}
        </div>
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
              {assignments.length === 0 ? (
                <>
                  Add an assignment first — Pomodoro needs one to log against.{" "}
                  <Link href="/assignments" className="font-extrabold text-violet hover:underline">
                    Add one now →
                  </Link>
                </>
              ) : (
                "Pick an assignment first."
              )}
            </p>
          )}
        </>
      )}

      {finishedPhase && !isRunning && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
            <Pilo mood="happy" size={24} />
          </span>
          <p className="text-[12.5px] font-bold text-ink">
            {finishedPhase === "work"
              ? "Cycle logged — break started."
              : "Break's over — ready for another cycle?"}
          </p>
        </div>
      )}

      <Modal
        open={confirmingStop}
        onClose={() => setConfirmingStop(false)}
        title="Stop focus session"
      >
        <h2 className="font-display text-lg font-bold text-ink">Stop this session?</h2>
        <p className="mt-2 text-sm font-semibold text-ink-2">
          {`This logs a partial session for ${formatClock(duration - displayRemaining)} — it won't count toward your streak.`}
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmingStop(false)}
            className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={confirmStopEarly}
            disabled={pending}
            className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
          >
            {pending ? "Stopping…" : "Stop"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
