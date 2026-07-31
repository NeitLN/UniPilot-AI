import { describe, expect, it } from "vitest";
import { notificationTargetUrl } from "@/lib/notifications/target-url";

describe("notificationTargetUrl", () => {
  it("maps each known notification kind to its route", () => {
    expect(notificationTargetUrl("assignment_reminder")).toBe("/assignments");
    expect(notificationTargetUrl("event_reminder")).toBe("/schedule");
    expect(notificationTargetUrl("risk_warning")).toBe("/risk");
    expect(notificationTargetUrl("study_session")).toBe("/planner");
  });

  it("falls back to the notifications list for an unrecognized kind", () => {
    expect(notificationTargetUrl("something_new")).toBe("/notifications");
  });
});
