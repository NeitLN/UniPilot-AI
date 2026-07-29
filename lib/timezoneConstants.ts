// Shared between lib/timezone.ts (server-only) and components/TimezoneCookie.tsx
// (client) — kept in its own file with no "server-only" import so the client
// component can use it without pulling next/headers into the client bundle.
export const TIMEZONE_COOKIE = "tz";
