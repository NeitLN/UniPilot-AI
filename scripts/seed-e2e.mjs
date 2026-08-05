// Seeds (or re-seeds) the dedicated E2E test account so `npx playwright test`
// has a user with: a confirmed login, weekly availability, one course, one
// baseline pending assignment, and 7+ days of completed focus history
// (needed for the Workload Risk score to actually compute — see BR-06).
//
// Safe to re-run — every step is idempotent (upsert / "does it exist?" checks).
//
// Usage: node scripts/seed-e2e.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const email = env.E2E_EMAIL;
const password = env.E2E_PASSWORD;
if (!email || !password) {
  console.error("Set E2E_EMAIL / E2E_PASSWORD in .env.local first.");
  process.exit(1);
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. User (create if missing)
const { data: userList } = await sb.auth.admin.listUsers();
let user = userList.users.find((u) => u.email === email);
if (!user) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
  console.log("Created E2E user:", user.id);
} else {
  console.log("E2E user already exists:", user.id);
}
const userId = user.id;

// 2. Profile — the on_auth_user_created trigger already inserted a row;
// this just ensures availability is set for the Planner/Risk gates.
await sb.from("profiles").upsert({ id: userId, weekly_availability_hours: 20 });

// 3. Course
const { data: existingCourse } = await sb
  .from("courses")
  .select("id")
  .eq("user_id", userId)
  .maybeSingle();
let courseId = existingCourse?.id;
if (!courseId) {
  const { data, error } = await sb
    .from("courses")
    .insert({
      user_id: userId,
      name: "E2E Test Course",
      code: "E2E101",
      credits: 3,
      semester: "E2E",
    })
    .select("id")
    .single();
  if (error) throw error;
  courseId = data.id;
  console.log("Created course:", courseId);
}

// 4. Baseline pending assignment (separate from the throwaway one the
// assignments spec creates and archives itself)
const { data: existingAssignment } = await sb
  .from("assignments")
  .select("id")
  .eq("user_id", userId)
  .eq("title", "E2E Baseline Assignment")
  .maybeSingle();
let assignmentId = existingAssignment?.id;
if (!assignmentId) {
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 30);
  const { data, error } = await sb
    .from("assignments")
    .insert({
      user_id: userId,
      course_id: courseId,
      title: "E2E Baseline Assignment",
      due_at: dueAt.toISOString(),
      weight: 10,
      priority: "low",
      status: "not_started",
    })
    .select("id")
    .single();
  if (error) throw error;
  assignmentId = data.id;
  console.log("Created baseline assignment:", assignmentId);
}

// 5. 7+ distinct days of completed focus history (BR-06 gate)
const { data: existingSessions } = await sb
  .from("focus_sessions")
  .select("started_at")
  .eq("user_id", userId);
const existingDays = new Set((existingSessions ?? []).map((s) => s.started_at.slice(0, 10)));

const rows = [];
for (let i = 0; i < 8; i++) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const dayKey = d.toISOString().slice(0, 10);
  if (existingDays.has(dayKey)) continue;
  const start = new Date(d);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 25 * 60_000);
  rows.push({
    user_id: userId,
    assignment_id: assignmentId,
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
    duration_seconds: 1500,
    result: "completed",
  });
}
if (rows.length > 0) {
  const { error } = await sb.from("focus_sessions").insert(rows);
  if (error) throw error;
  console.log("Inserted focus history rows:", rows.length);
}

console.log("E2E seed complete.");
