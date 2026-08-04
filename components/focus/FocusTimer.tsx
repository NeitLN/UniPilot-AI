"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Play, Coffee, Sofa, Music, Bell } from "lucide-react";
import { Pilo } from "@/components/brand/Pilo";
import { Modal } from "@/components/ui/Modal";
import { confirmVariants } from "@/lib/motion/variants";
import { logFocusSession } from "@/app/(app)/focus/actions";
import {
  breakKindForCycle,
  LONG_BREAK_SECONDS,
  POMODORO_SECONDS,
  SHORT_BREAK_SECONDS,
} from "@/lib/rules/focus";
import { enqueueMutation } from "@/lib/offline/idb";
import { FOCUS_TRACKS } from "@/lib/audio/focus-tracks";
import { FOCUS_SESSION_STORAGE_KEY as STORAGE_KEY } from "@/lib/focus/local-session";

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
  /** Work-phase duration in seconds (Step 4.1: 25/45/60 min picker) — absent
   * on sessions stored before this field existed, or during a break (which
   * derives its own duration from breakKind instead). */
  workDurationSeconds?: number;
  /** Set while paused; timer freezes at the remaining time it had then. */
  pausedAt: string | null;
  /** True when the viewer started this break directly from the idle
   * picker (the Short/Long break pills) rather than earning it by
   * finishing a work cycle — changes the banner copy so it never claims a
   * cycle was completed when one wasn't. */
  manualBreak?: boolean;
}

const DURATION_OPTIONS_MIN = [25, 45, 60] as const;
type DurationMinutes = (typeof DURATION_OPTIONS_MIN)[number];

function isDurationMinutes(n: number): n is DurationMinutes {
  return (DURATION_OPTIONS_MIN as readonly number[]).includes(n);
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
      workDurationSeconds: parsed.workDurationSeconds,
      pausedAt: parsed.pausedAt ?? null,
      manualBreak: parsed.manualBreak,
    };
  } catch {
    return null;
  }
}

function readCycleCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(CYCLE_COUNT_KEY) ?? "0") || 0;
}

function phaseDuration(
  session: Pick<StoredSession, "phase" | "breakKind" | "workDurationSeconds">,
): number {
  if (session.phase === "work") return session.workDurationSeconds ?? POMODORO_SECONDS;
  return session.breakKind === "long"
    ? LONG_BREAK_SECONDS
    : SHORT_BREAK_SECONDS;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function FocusTimer({
  assignments,
  defaultDurationMinutes = 25,
}: {
  assignments: FocusAssignmentOption[];
  /** From profiles.default_focus_minutes (Settings' Study preferences,
   * Step 4.1) — the picker below still lets a session override it. */
  defaultDurationMinutes?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<DurationMinutes>(
    isDurationMinutes(defaultDurationMinutes) ? defaultDurationMinutes : 25,
  );
  // Pilo's pick "Focus now" CTA (brief §6.4) deep-links here with
  // ?assignment=<id> — only honored when it names one of this viewer's own
  // active assignments, otherwise falls back to the ordinary default.
  const [selectedId, setSelectedId] = useState(() => {
    const fromQuery = searchParams.get("assignment");
    if (fromQuery && assignments.some((a) => a.id === fromQuery)) return fromQuery;
    return assignments[0]?.id ?? "";
  });
  const [remaining, setRemaining] = useState(POMODORO_SECONDS);
  const [finishedPhase, setFinishedPhase] = useState<Phase | null>(null);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [pending, setPending] = useState(false);
  const finishedRef = useRef(false);

  // Real CC0/public-domain background tracks (public/audio/CREDITS.md) —
  // only actually plays while a work phase is running. `trackIndex` picks
  // a random track each time the toggle goes from off to on, so repeat
  // sessions don't always open with the same loop.
  const [audioOn, setAudioOn] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

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

  // Only a WORK phase reaching its full chosen duration (auto-timeout or
  // the ordinary finish path) logs anything to the server — breaks are pure
  // local timer state, never sent as a focus_sessions row.
  async function finishWorkSession(current: StoredSession) {
    setPending(true);
    const input = {
      assignmentId: current.assignmentId,
      startedAt: current.startedAt,
      endedAt: new Date().toISOString(),
      targetDurationSeconds: current.workDurationSeconds ?? POMODORO_SECONDS,
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
      const elapsed =
        (Date.now() - new Date(session!.startedAt).getTime()) / 1000;
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
      workDurationSeconds: selectedDurationMinutes * 60,
      pausedAt: null,
    });
  }

  /** Short/Long break pills — a real break the viewer chose to take now,
   * distinct from the one auto-granted after a completed work cycle
   * (completeWork above). Never logged to the server, same as any break. */
  function handleStartBreak(kind: BreakKind) {
    setFinishedPhase(null);
    persist({
      assignmentId: selectedId,
      startedAt: new Date().toISOString(),
      phase: "break",
      breakKind: kind,
      pausedAt: null,
      manualBreak: true,
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

  const shouldPlayAudio = audioOn && isRunning && !isBreak && !isPaused;

  // Plays only while a work phase is actively running (not paused, not on
  // break, not idle) — toggling the button just sets the preference; this
  // effect is the single place that actually starts/stops playback, so
  // pausing the timer or hitting a break silences it automatically. Kept
  // separate from the track-change effect below so pausing/resuming never
  // restarts the current track from 0:00.
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    if (shouldPlayAudio) {
      void el.play().catch(() => {
        // Autoplay can be blocked if this effect fires without a recent
        // click in the chain (e.g. resuming an in-flight session after a
        // reload) — the toggle button itself is always a real click, so
        // this only silently no-ops the reload-resume edge case.
      });
    } else {
      el.pause();
    }
  }, [shouldPlayAudio]);

  // "Next track" — the <audio> element's `src` prop already points at the
  // new file by the time this runs; `load()` makes the browser actually
  // pick it up (a bare src-attribute change isn't reliably enough on its
  // own across browsers), then resumes playback if it was already playing.
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    el.load();
    if (shouldPlayAudio) void el.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately track-only; shouldPlayAudio read fresh, not a re-run trigger
  }, [trackIndex]);

  const duration = session ? phaseDuration(session) : selectedDurationMinutes * 60;
  const displayRemaining = session
    ? session.pausedAt
      ? duration -
        (new Date(session.pausedAt).getTime() -
          new Date(session.startedAt).getTime()) /
          1000
      : remaining
    : selectedDurationMinutes * 60;
  const progress = Math.max(0, Math.min(1, displayRemaining / duration));
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const activeAssignment = assignments.find(
    (a) => a.id === (session?.assignmentId ?? selectedId),
  );

  return (
    <div
      className={`flex h-full flex-col rounded-card p-5 text-center ${isBreak ? "bg-mint" : "bg-lime"}`}
    >
      <audio ref={audioElRef} src={FOCUS_TRACKS[trackIndex].src} loop preload="none" className="hidden" />

      {/* Top: assignment picker (idle) or the running/break title — height
          varies with content, unlike the timer block below it. */}
      <div>
        {!isRunning && (
          <>
            <label className="mb-3 block text-left text-xs font-bold text-ink/70">
              What are you working on?
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={assignments.length === 0}
                className="mt-1 min-h-11 w-full rounded-ctl border border-ink/15 bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60"
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

            <div className="mb-3 text-left">
              <span className="block text-xs font-bold text-ink/70">Duration</span>
              <div role="radiogroup" aria-label="Focus session duration" className="mt-1 flex gap-1.5">
                {DURATION_OPTIONS_MIN.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    role="radio"
                    aria-checked={selectedDurationMinutes === mins}
                    onClick={() => setSelectedDurationMinutes(mins)}
                    className={`flex min-h-11 flex-1 items-center justify-center rounded-ctl text-sm font-extrabold motion-safe:transition-colors motion-safe:duration-200 ${
                      selectedDurationMinutes === mins ? "bg-ink text-white" : "bg-card text-ink-2 hover:bg-card/70"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {isRunning && isBreak && (
          <p className="mb-2 text-[12.5px] font-bold text-ink/70">
            {session.breakKind === "long" ? "Long break" : "Short break"}
            {session.manualBreak
              ? " — take a breather."
              : ` — nice work on ${activeAssignment?.title ?? "that cycle"}`}
          </p>
        )}
        {isRunning && !isBreak && activeAssignment && (
          <p className="mb-2 truncate text-[12.5px] font-bold text-ink/70">
            {activeAssignment.title}
          </p>
        )}
      </div>

      {/* Middle: the timer itself, vertically centered in whatever height
          this card ends up with — on the /focus page it sits next to a
          taller "This week" card (docs/PRODUCT_REVIEW_4.md, dashboard-gap
          feedback), and h-full above stretches this card to match instead
          of leaving canvas-colored space beneath a short card. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-5">
        <div className="relative mx-auto flex h-[190px] w-[190px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 150 150" className="absolute inset-0 -rotate-90">
            <circle
              cx="75"
              cy="75"
              r={RADIUS}
              fill="none"
              strokeWidth="12"
              className="stroke-ink/15"
            />
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
          <p className="font-display text-5xl font-bold text-ink tabular-nums">
            {formatClock(displayRemaining)}
          </p>
        </div>

        {/* Companion, not decoration on every card (brief §5.3) — restrained
            to this one timer surface. Headphones + laptop pose regardless of
            state (the dedicated Focus Timer asset has no mood variants). */}
        <Image
          src="/mascots/pilo-focus-timer.png"
          alt=""
          width={170}
          height={170}
          className="hidden h-auto w-[170px] object-contain sm:block"
        />
      </div>

      <p className="mt-3 text-center text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink/60">
        {isBreak ? "Break" : "Focus session"}
        {isPaused ? " · Paused" : ""}
      </p>

      {/* Bottom: actions, pinned to the card's bottom edge regardless of
          how much extra height the middle section absorbed above. */}
      <div>
        {isRunning ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handlePauseToggle}
              disabled={pending}
              className="flex-1 rounded-ctl bg-card py-3 text-sm font-extrabold text-foreground disabled:opacity-60"
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
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-ctl bg-ink py-3 text-sm font-extrabold text-white disabled:opacity-45"
            >
              <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
              Start focus
            </button>

            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => handleStartBreak("short")}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-ctl bg-card text-xs font-extrabold text-ink hover:bg-card/70"
              >
                <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
                Short break {Math.round(SHORT_BREAK_SECONDS / 60)}m
              </button>
              <button
                type="button"
                onClick={() => handleStartBreak("long")}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-ctl bg-card text-xs font-extrabold text-ink hover:bg-card/70"
              >
                <Sofa className="h-3.5 w-3.5" aria-hidden="true" />
                Long break {Math.round(LONG_BREAK_SECONDS / 60)}m
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!audioOn) setTrackIndex(Math.floor(Math.random() * FOCUS_TRACKS.length));
                  setAudioOn((v) => !v);
                }}
                aria-pressed={audioOn}
                title="Real, CC0/public-domain background music (see public/audio/CREDITS.md) — plays while a focus session is running."
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-ctl bg-card text-xs font-extrabold text-ink hover:bg-card/70"
              >
                <Music className="h-3.5 w-3.5" aria-hidden="true" />
                Lo-fi · {audioOn ? "On" : "Off"}
              </button>
            </div>
            {audioOn && (
              <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold text-ink/70">
                <span className="truncate">{FOCUS_TRACKS[trackIndex].label}</span>
                <button
                  type="button"
                  onClick={() => setTrackIndex((i) => (i + 1) % FOCUS_TRACKS.length)}
                  className="rounded-pill bg-card px-2.5 py-1 text-[10.5px] font-extrabold text-ink hover:bg-card/70"
                >
                  Next track
                </button>
              </div>
            )}
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10.5px] font-semibold text-ink/60">
              <Bell className="h-3 w-3" aria-hidden="true" />
              Notifications stay quiet while you focus.
            </p>
            {!selectedId && (
              <p className="mt-2 text-[11.5px] font-semibold text-ink/70">
                {assignments.length === 0 ? (
                  <>
                    Add an assignment first — Pomodoro needs one to log against.{" "}
                    <Link
                      href="/assignments"
                      className="font-extrabold text-violet hover:underline"
                    >
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

        {/* Restrained completion confirmation, not a celebration — a
            Pomodoro cycle finishing is routine, not a milestone. Fades +
            settles in once; AnimatePresence lets it fade back out cleanly
            if the user immediately starts the next cycle instead of
            popping away mid-read. */}
        <AnimatePresence>
          {finishedPhase && !isRunning && (
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={confirmVariants}
              role="status"
              aria-live="polite"
              className="mt-3 flex items-center justify-center gap-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
                <Pilo mood="happy" size={24} />
              </span>
              <p className="text-[12.5px] font-bold text-ink">
                {finishedPhase === "work"
                  ? "Cycle logged — break started."
                  : "Break's over — ready for another cycle?"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal
        open={confirmingStop}
        onClose={() => setConfirmingStop(false)}
        title="Stop focus session"
      >
        <h2 className="font-display text-lg font-bold text-foreground">
          Stop this session?
        </h2>
        <p className="mt-2 text-sm font-semibold text-ink-2">
          {`This logs a partial session for ${formatClock(duration - displayRemaining)} — it won't count toward your streak.`}
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmingStop(false)}
            className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
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
