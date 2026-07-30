// F-05 (future_update.md's numbering collided with the PWA F-05 — this is
// the "export data" one, listed under §5 ý tưởng nâng tầm) — CSV/JSON export.

/** RFC 4180-ish: quote a field only when it needs it, doubling embedded quotes. */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Renders a flat array of same-shaped records into a CSV string (header + rows). */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((c) => csvField(row[c])).join(","));
  return [header, ...body].join("\r\n");
}
