const TARGET_BY_KIND: Record<string, string> = {
  assignment_reminder: "/assignments",
  event_reminder: "/schedule",
  risk_warning: "/risk",
  study_session: "/planner",
};

/** Where clicking a notification (in-OS push or in-app) should land — the
 * app has no per-item detail routes, so this resolves to the list/page that
 * contains the relevant item rather than a specific record. */
export function notificationTargetUrl(kind: string): string {
  return TARGET_BY_KIND[kind] ?? "/notifications";
}
