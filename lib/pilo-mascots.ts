export const PILO_MASCOTS = {
  logo: "/mascots/pilo-logo.png",
  assignments: "/mascots/pilo-assignments.png",
  aiPlanner: "/mascots/pilo-ai-planner.png",
  focusTimer: "/mascots/pilo-focus-timer.png",
  gpaTracker: "/mascots/pilo-gpa-tracker.png",
  workloadRisk: "/mascots/pilo-workload-risk.png",
  weeklyReport: "/mascots/pilo-weekly-report.png",
  settingsAvatar: "/mascots/pilo-settings-avatar.png",
} as const;

export type PiloMascotKey = keyof typeof PILO_MASCOTS;
