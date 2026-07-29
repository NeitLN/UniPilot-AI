// BR-02 — gate for generating an AI study plan, and server-side validation
// of whatever Gemini hands back (never trusted as-is).
// docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 7.

export interface PlanGateInput {
  weeklyAvailabilityHours: number;
  pendingAssignmentCount: number;
}

export interface PlanGateResult {
  ok: boolean;
  reasons: string[];
}

/** Both conditions are required before calling Gemini at all — client and server. */
export function canGeneratePlan(input: PlanGateInput): PlanGateResult {
  const reasons: string[] = [];
  if (input.weeklyAvailabilityHours <= 0) {
    reasons.push("Set your weekly availability hours above 0 in your profile.");
  }
  if (input.pendingAssignmentCount < 1) {
    reasons.push("Add at least one assignment that isn't done yet.");
  }
  return { ok: reasons.length === 0, reasons };
}

export interface TimeRange {
  startAt: string;
  endAt: string;
}

export interface StudySessionCandidate extends TimeRange {
  assignmentId: string;
  reason?: string;
}

export interface ValidatedSession extends StudySessionCandidate {
  valid: boolean;
  violation?: string;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export interface ValidateSessionsInput {
  sessions: StudySessionCandidate[];
  classBlocks: TimeRange[];
  assignmentDueAt: Record<string, string>;
  dailyAvailabilityHours: number;
}

/**
 * Rejects (but doesn't silently drop) anything Gemini proposed that:
 *  - overlaps a real class block, or another proposed session
 *  - is scheduled after that assignment's own due date
 *  - would push the day's total past the user's daily availability
 * Processed earliest-start-first, so on a crowded day the earlier sessions
 * keep their slot and later ones are the ones flagged.
 */
export function validateSessions({
  sessions,
  classBlocks,
  assignmentDueAt,
  dailyAvailabilityHours,
}: ValidateSessionsInput): ValidatedSession[] {
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const committedBlocks: TimeRange[] = [...classBlocks];
  const dailyMinutesUsed: Record<string, number> = {};
  const dailyCapMinutes = dailyAvailabilityHours * 60;

  return ordered.map((s) => {
    const start = new Date(s.startAt).getTime();
    const end = new Date(s.endAt).getTime();

    if (!(end > start)) {
      return { ...s, valid: false, violation: "End time must be after the start time." };
    }

    const clashes = committedBlocks.some((b) =>
      overlaps(start, end, new Date(b.startAt).getTime(), new Date(b.endAt).getTime()),
    );
    if (clashes) {
      return { ...s, valid: false, violation: "Overlaps a class or another study session." };
    }

    const dueAt = assignmentDueAt[s.assignmentId];
    if (dueAt && end > new Date(dueAt).getTime()) {
      return { ...s, valid: false, violation: "Scheduled after this assignment's due date." };
    }

    const key = dayKey(s.startAt);
    const minutes = (end - start) / 60000;
    const usedSoFar = dailyMinutesUsed[key] ?? 0;
    if (usedSoFar + minutes > dailyCapMinutes) {
      return { ...s, valid: false, violation: "Exceeds your available hours for that day." };
    }

    dailyMinutesUsed[key] = usedSoFar + minutes;
    committedBlocks.push({ startAt: s.startAt, endAt: s.endAt });
    return { ...s, valid: true };
  });
}

export interface SessionReminderInput {
  assignmentTitle: string;
  startAt: string;
}

export interface NotificationDraft {
  kind: string;
  title: string;
  body: string;
  scheduledAt: string;
}

/** FR-06 — one in-app reminder row per confirmed session (delivery lands in Phase 9). */
export function buildSessionReminders(
  sessions: SessionReminderInput[],
): NotificationDraft[] {
  return sessions.map((s) => ({
    kind: "study_session",
    title: `Study session: ${s.assignmentTitle}`,
    body: "Time to start your planned study session.",
    scheduledAt: s.startAt,
  }));
}
