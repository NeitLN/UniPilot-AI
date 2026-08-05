import "server-only";

/**
 * DEVOPS-02 — somewhere for an error to go other than the browser console.
 *
 * Deliberately provider-agnostic. Swapping in Sentry or similar is a change
 * to `deliver()` below and nothing else, and it needs an account and a DSN,
 * which is a decision rather than a code change. What this does today works
 * without either:
 *
 *   1. Writes one structured JSON line to stderr. Every platform that runs
 *      Next.js — Vercel, Fly, Docker, CloudWatch — collects stderr, so this
 *      alone makes errors searchable and alertable with no dependency at
 *      all. `console.error(error)` did not: it printed a stack with no
 *      route, no user, no revision, and nothing machine-readable to filter
 *      on.
 *   2. POSTs the same payload to ERROR_WEBHOOK_URL when that is set, which
 *      is enough to reach Slack, Discord or a custom collector today.
 *
 * Never throws. A failure in error reporting must not become a second
 * error, and must never replace the original one.
 */

export interface ErrorContext {
  /** Where it happened — a route path, or an action/job name. */
  source: string;
  /** Next.js's error digest, which is the only handle a server error leaves
   * in the client. Logging it is what lets a user report ("I saw digest
   * 1234567") be matched to the real stack. */
  digest?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

interface ErrorPayload {
  level: "error";
  event: "unhandled_error";
  message: string;
  stack?: string;
  name: string;
  source: string;
  digest?: string;
  userId?: string;
  revision: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

function revision(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "unknown";
}

export function buildErrorPayload(error: unknown, context: ErrorContext): ErrorPayload {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    level: "error",
    // A fixed event name so a log query can find every one of these without
    // matching on message text, which changes constantly.
    event: "unhandled_error",
    message: err.message,
    stack: err.stack,
    name: err.name,
    source: context.source,
    digest: context.digest,
    userId: context.userId,
    revision: revision(),
    timestamp: new Date().toISOString(),
    extra: context.extra,
  };
}

async function deliver(payload: ErrorPayload): Promise<void> {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Never let reporting hold a request open. The stderr line has already
    // been written by the time this runs, so a timeout loses the webhook
    // copy and nothing else.
    signal: AbortSignal.timeout(3000),
  });
}

export async function reportError(error: unknown, context: ErrorContext): Promise<void> {
  let payload: ErrorPayload;
  try {
    payload = buildErrorPayload(error, context);
  } catch {
    // Building the payload should be impossible to fail, but if it does the
    // original error still has to reach the log.
    console.error("[observability] failed to build error payload", error);
    return;
  }

  // Single line, so a log collector treats it as one event rather than
  // splitting a multi-line stack into unrelated records.
  console.error(JSON.stringify(payload));

  try {
    await deliver(payload);
  } catch (cause) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "error_reporting_failed",
        message: cause instanceof Error ? cause.message : String(cause),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
