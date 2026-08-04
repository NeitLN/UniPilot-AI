import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/export/csv";
import { consumeRateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

const RESOURCES = ["courses", "assignments", "grades", "schedule", "focus"] as const;
type Resource = (typeof RESOURCES)[number];

function isResource(value: string): value is Resource {
  return (RESOURCES as readonly string[]).includes(value);
}

/** Own module rather than lib/export/csv.ts: keeps the Supabase queries next
 * to the one route that runs them, instead of a data-access layer nobody
 * else needs. */
async function loadResource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resource: Resource,
) {
  switch (resource) {
    case "courses": {
      const { data } = await supabase
        .from("courses")
        .select("code, name, credits, semester, created_at")
        .order("semester");
      return { rows: data ?? [], columns: ["code", "name", "credits", "semester", "created_at"] as const };
    }
    case "assignments": {
      const { data } = await supabase
        .from("assignments")
        .select("title, due_at, weight, score, priority, status, progress, archived_at")
        .order("due_at");
      return {
        rows: data ?? [],
        columns: ["title", "due_at", "weight", "score", "priority", "status", "progress", "archived_at"] as const,
      };
    }
    case "grades": {
      const { data } = await supabase
        .from("grades")
        .select("semester, grade_point, credit_hours, created_at")
        .order("semester");
      return { rows: data ?? [], columns: ["semester", "grade_point", "credit_hours", "created_at"] as const };
    }
    case "schedule": {
      const { data } = await supabase
        .from("class_blocks")
        .select("title, location, start_at, end_at, is_all_day")
        .order("start_at");
      return { rows: data ?? [], columns: ["title", "location", "start_at", "end_at", "is_all_day"] as const };
    }
    case "focus": {
      const { data } = await supabase
        .from("focus_sessions")
        .select("started_at, ended_at, duration_seconds, result")
        .order("started_at");
      return { rows: data ?? [], columns: ["started_at", "ended_at", "duration_seconds", "result"] as const };
    }
  }
}

/** FR-06/§5 "Xuất dữ liệu (CSV/JSON)": everything RLS already scopes to the
 * signed-in user, so a plain select is safe — no separate ownership check
 * needed beyond the session itself. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Session expired — sign in again." }, { status: 401 });
  }

  // SEC-01: a ceiling per user, checked right after auth so a rejected
  // caller never reaches the expensive part below.
  const limit = await consumeRateLimit(supabase, RATE_LIMITS.export);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many exports in the last hour — try again shortly." },
      { status: 429, headers: rateLimitHeaders(RATE_LIMITS.export, limit) },
    );
  }

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const typeParam = request.nextUrl.searchParams.get("type") ?? "all";

  if (format === "csv") {
    if (!isResource(typeParam)) {
      return NextResponse.json(
        { error: `?type must be one of: ${RESOURCES.join(", ")}` },
        { status: 400 },
      );
    }
    const { rows, columns } = await loadResource(supabase, typeParam);
    const csv = toCsv(
      rows as unknown as Record<string, unknown>[],
      columns as unknown as string[],
    );
    // UTF-8 BOM: without it, Excel guesses the wrong codepage and mangles
    // Vietnamese diacritics on open, even though the bytes are valid UTF-8.
    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="unipilot-${typeParam}.csv"`,
      },
    });
  }

  const resources = typeParam === "all" ? RESOURCES : isResource(typeParam) ? [typeParam] : null;
  if (!resources) {
    return NextResponse.json(
      { error: `?type must be "all" or one of: ${RESOURCES.join(", ")}` },
      { status: 400 },
    );
  }

  const entries = await Promise.all(
    resources.map(async (r) => [r, (await loadResource(supabase, r)).rows] as const),
  );
  const bundle = Object.fromEntries(entries);

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="unipilot-${typeParam === "all" ? "export" : typeParam}.json"`,
    },
  });
}
