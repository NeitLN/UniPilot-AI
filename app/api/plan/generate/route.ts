import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canGeneratePlan, validateSessions } from "@/lib/rules/plan";
import { buildPlanPrompt } from "@/lib/gemini/prompt";
import { generatePlanJson, GeminiTimeoutError } from "@/lib/gemini/client";
import { parseGeminiPlanResponse } from "@/lib/gemini/schema";
import { consumeRateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

// Safety margin above our own 20s Gemini timeout for Vercel's function limit.
export const maxDuration = 30;

function startOfWeek(d = new Date()): Date {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (day.getDay() + 6) % 7; // 0 = Monday
  day.setDate(day.getDate() - mondayOffset);
  return day;
}

/** `Date.toISOString().slice(0, 10)` converts through UTC first, which
 * shifts the calendar date backward by a day for any positive-UTC-offset
 * server timezone (e.g. a midnight-local `startOfWeek()` in UTC+7 becomes
 * 17:00 the previous day in UTC) — caught via the AI Planner redesign's day
 * tabs, which visibly showed Sunday before Monday once `week_start` was
 * rendered directly instead of only being used for less-visible date-math
 * comparisons. `startOfWeek()`'s Date is already local-midnight, so this
 * reads its Y/M/D components directly rather than round-tripping through UTC. */
function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // SEC-01: a ceiling per user, checked right after auth so a rejected
  // caller never reaches the expensive part below.
  const limit = await consumeRateLimit(supabase, RATE_LIMITS.planGenerate);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You've generated a lot of plans in the last hour — try again shortly." },
      { status: 429, headers: rateLimitHeaders(RATE_LIMITS.planGenerate, limit) },
    );
  }

  const [{ data: profile }, { data: assignmentRows }, { data: classBlockRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("weekly_availability_hours, target_gpa")
        .maybeSingle(),
      supabase
        .from("assignments")
        .select("id, title, due_at, weight, priority, progress")
        .is("archived_at", null)
        .neq("status", "done"),
      supabase.from("class_blocks").select("title, start_at, end_at"),
    ]);

  const weeklyAvailabilityHours = profile?.weekly_availability_hours ?? 0;
  const assignments = assignmentRows ?? [];

  // BR-02 — checked here too, not just client-side.
  const gate = canGeneratePlan({
    weeklyAvailabilityHours,
    pendingAssignmentCount: assignments.length,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reasons.join(" ") }, { status: 400 });
  }

  const weekStart = startOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const classBlocksThisWeek = (classBlockRows ?? []).filter((b) => {
    const s = new Date(b.start_at).getTime();
    return s >= weekStart.getTime() && s < weekEnd.getTime();
  });

  const promptInput = {
    weekStart: toLocalDateString(weekStart),
    weeklyAvailabilityHours,
    targetGpa: profile?.target_gpa ?? null,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      dueAt: a.due_at,
      weight: a.weight,
      priority: a.priority,
      progress: a.progress,
    })),
    classBlocks: classBlocksThisWeek.map((b) => ({
      title: b.title,
      startAt: b.start_at,
      endAt: b.end_at,
    })),
  };

  let rawText: string;
  try {
    rawText = await generatePlanJson(buildPlanPrompt(promptInput));
  } catch (err) {
    if (err instanceof GeminiTimeoutError) {
      return NextResponse.json(
        { error: "Gemini took too long to respond.", retryable: true },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Couldn't reach Gemini.", retryable: true },
      { status: 502 },
    );
  }

  const parsed = parseGeminiPlanResponse(rawText);
  if (!parsed) {
    return NextResponse.json(
      { error: "Gemini's response wasn't valid JSON.", retryable: true },
      { status: 502 },
    );
  }

  // Never trust the model: drop any session pointing at an assignment we
  // didn't actually offer it, then re-validate every remaining one server-side.
  const assignmentIds = new Set(assignments.map((a) => a.id));
  const assignmentDueAt = Object.fromEntries(
    assignments.map((a) => [a.id, a.due_at]),
  );
  const candidateSessions = parsed.sessions.filter((s) =>
    assignmentIds.has(s.assignmentId),
  );

  const validated = validateSessions({
    sessions: candidateSessions,
    classBlocks: classBlocksThisWeek.map((b) => ({
      startAt: b.start_at,
      endAt: b.end_at,
    })),
    assignmentDueAt,
    dailyAvailabilityHours: weeklyAvailabilityHours / 7,
  });

  const validSessions = validated.filter((s) => s.valid);
  const rejectedSessions = validated
    .filter((s) => !s.valid)
    .map((s) => ({
      assignmentId: s.assignmentId,
      startAt: s.startAt,
      endAt: s.endAt,
      violation: s.violation,
    }));

  // Only one open draft at a time — generating again replaces it, an
  // already-active plan is untouched (BR-02).
  await supabase
    .from("study_plans")
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "draft");

  const { data: plan, error: planError } = await supabase
    .from("study_plans")
    .insert({
      user_id: user.id,
      week_start: promptInput.weekStart,
      status: "draft",
      input_snapshot: promptInput,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return NextResponse.json(
      { error: "Couldn't save the draft plan." },
      { status: 500 },
    );
  }

  if (validSessions.length > 0) {
    const { error: sessionsError } = await supabase.from("study_sessions").insert(
      validSessions.map((s) => ({
        plan_id: plan.id,
        assignment_id: s.assignmentId,
        start_at: s.startAt,
        end_at: s.endAt,
        reason: s.reason || null,
      })),
    );
    if (sessionsError) {
      return NextResponse.json(
        { error: "Couldn't save the study sessions." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    planId: plan.id,
    sessionCount: validSessions.length,
    rejectedSessions,
  });
}
