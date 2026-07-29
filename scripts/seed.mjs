// Dev-only seed script (docs/ROADMAP.md Phase 1).
// Creates (or reuses) a dev account and fills it with 4 courses, 12
// assignments (3 overdue), 4 grades, and 14 focus sessions, so the
// dashboard has real data to render against during Phase 2+.
//
// Usage: node scripts/seed.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const DEV_EMAIL = "dev@unipilot.local";
const DEV_PASSWORD = "DevPass123!";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysFromNow(days, hour = 23, minute = 59) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function ensureDevUser() {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === DEV_EMAIL);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function clearExistingData(userId) {
  // Children first to respect FKs where cascade isn't already guaranteed.
  await supabase.from("notifications").delete().eq("user_id", userId);
  await supabase.from("risk_warnings").delete().eq("user_id", userId);
  await supabase.from("risk_scores").delete().eq("user_id", userId);
  await supabase.from("study_plans").delete().eq("user_id", userId); // cascades to study_sessions
  await supabase.from("focus_sessions").delete().eq("user_id", userId);
  await supabase.from("grades").delete().eq("user_id", userId);
  await supabase.from("assignments").delete().eq("user_id", userId);
  await supabase.from("courses").delete().eq("user_id", userId);
}

async function seed() {
  const userId = await ensureDevUser();
  console.log(`Dev user ready: ${DEV_EMAIL} (${userId})`);

  await clearExistingData(userId);

  await supabase.from("profiles").upsert({
    id: userId,
    full_name: "Vo Viet Tien",
    target_gpa: 3.6,
    weekly_availability_hours: 14,
  });

  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .insert([
      {
        user_id: userId,
        code: "DBMS",
        name: "Database management systems",
        credits: 3,
        semester: "253",
      },
      {
        user_id: userId,
        code: "REQE",
        name: "Requirements engineering",
        credits: 3,
        semester: "253",
      },
      {
        user_id: userId,
        code: "MATH",
        name: "Mathematics for computing",
        credits: 4,
        semester: "253",
      },
      {
        user_id: userId,
        code: "WEBP",
        name: "Web programming",
        credits: 3,
        semester: "253",
      },
    ])
    .select();
  if (courseErr) throw courseErr;

  const [dbms, reqe, math, webp] = courses;

  const { data: assignments, error: assignErr } = await supabase
    .from("assignments")
    .insert([
      // 3 overdue
      {
        user_id: userId,
        course_id: dbms.id,
        title: "Database normalization report",
        due_at: daysFromNow(-2),
        weight: 20,
        priority: "high",
        status: "in_progress",
        progress: 45,
      },
      {
        user_id: userId,
        course_id: math.id,
        title: "Problem set 2",
        due_at: daysFromNow(-5),
        weight: 8,
        priority: "medium",
        status: "not_started",
        progress: 0,
      },
      {
        user_id: userId,
        course_id: webp.id,
        title: "Reading response 3",
        due_at: daysFromNow(-1),
        weight: 5,
        priority: "low",
        status: "in_progress",
        progress: 20,
      },
      // upcoming
      {
        user_id: userId,
        course_id: reqe.id,
        title: "SRS document v1.1",
        due_at: daysFromNow(0),
        weight: 30,
        priority: "high",
        status: "in_progress",
        progress: 80,
      },
      {
        user_id: userId,
        course_id: math.id,
        title: "Linear algebra problem set 4",
        due_at: daysFromNow(3),
        weight: 10,
        priority: "medium",
        status: "in_progress",
        progress: 30,
      },
      {
        user_id: userId,
        course_id: webp.id,
        title: "Web programming lab 6",
        due_at: daysFromNow(5),
        weight: 15,
        priority: "medium",
        status: "not_started",
        progress: 0,
      },
      {
        user_id: userId,
        course_id: dbms.id,
        title: "Indexing strategy quiz",
        due_at: daysFromNow(4),
        weight: 5,
        priority: "low",
        status: "not_started",
        progress: 0,
      },
      {
        user_id: userId,
        course_id: reqe.id,
        title: "Stakeholder interview summary",
        due_at: daysFromNow(7),
        weight: 10,
        priority: "medium",
        status: "not_started",
        progress: 10,
      },
      {
        user_id: userId,
        course_id: math.id,
        title: "Midterm review set",
        due_at: daysFromNow(10),
        weight: 12,
        priority: "medium",
        status: "not_started",
        progress: 0,
      },
      {
        user_id: userId,
        course_id: webp.id,
        title: "Final project proposal",
        due_at: daysFromNow(12),
        weight: 20,
        priority: "high",
        status: "not_started",
        progress: 5,
      },
      {
        user_id: userId,
        course_id: dbms.id,
        title: "Transaction isolation essay",
        due_at: daysFromNow(9),
        weight: 10,
        priority: "low",
        status: "not_started",
        progress: 0,
      },
      {
        user_id: userId,
        course_id: reqe.id,
        title: "Traceability matrix",
        due_at: daysFromNow(14),
        weight: 15,
        priority: "low",
        status: "not_started",
        progress: 0,
      },
    ])
    .select();
  if (assignErr) throw assignErr;

  const overdueCount = assignments.filter(
    (a) => new Date(a.due_at) < new Date() && a.status !== "done",
  ).length;
  console.log(`Assignments: ${assignments.length} (overdue: ${overdueCount})`);

  const { error: gradeErr } = await supabase.from("grades").insert([
    {
      user_id: userId,
      course_id: dbms.id,
      semester: "253",
      grade_point: 3.2,
      credit_hours: 3,
    },
    {
      user_id: userId,
      course_id: reqe.id,
      semester: "253",
      grade_point: 3.7,
      credit_hours: 3,
    },
    {
      user_id: userId,
      course_id: math.id,
      semester: "253",
      grade_point: 2.8,
      credit_hours: 4,
    },
    {
      user_id: userId,
      course_id: webp.id,
      semester: "253",
      grade_point: 3.5,
      credit_hours: 3,
    },
  ]);
  if (gradeErr) throw gradeErr;

  // 14 focus sessions across the last 6 days -> 6-day streak, 12 completed + 2 partial
  const focusAssignmentIds = [
    assignments[3].id,
    assignments[0].id,
    assignments[4].id,
  ];
  const sessions = [];
  let remainingPartial = 2;
  for (let day = 5; day >= 0; day--) {
    const perDay = day === 5 || day === 4 ? 3 : 2;
    for (let i = 0; i < perDay; i++) {
      const isPartial = remainingPartial > 0 && Math.random() < 0.15;
      const durationSeconds = isPartial ? 900 : 1500;
      if (isPartial) remainingPartial -= 1;

      const start = new Date();
      start.setUTCDate(start.getUTCDate() - day);
      start.setUTCHours(19 + i, 0, 0, 0);
      const end = new Date(start.getTime() + durationSeconds * 1000);

      sessions.push({
        user_id: userId,
        assignment_id: focusAssignmentIds[i % focusAssignmentIds.length],
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        duration_seconds: durationSeconds,
        result: isPartial ? "partial" : "completed",
      });
    }
  }
  // Trim/pad to exactly 14
  while (sessions.length > 14) sessions.pop();
  while (sessions.length < 14) {
    sessions.push({ ...sessions[sessions.length - 1] });
  }

  const { error: focusErr } = await supabase
    .from("focus_sessions")
    .insert(sessions);
  if (focusErr) throw focusErr;
  console.log(`Focus sessions: ${sessions.length}`);

  console.log("\nSeed complete.");
  console.log(
    `Log in at /login with:\n  email:    ${DEV_EMAIL}\n  password: ${DEV_PASSWORD}`,
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
