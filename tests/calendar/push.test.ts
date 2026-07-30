import { describe, expect, it } from "vitest";
import { buildCalendarEventBody } from "@/lib/calendar/map";

describe("buildCalendarEventBody", () => {
  it("prefixes the summary and carries start/end as ISO datetimes", () => {
    const body = buildCalendarEventBody({
      id: "session-1",
      startAt: "2026-08-01T09:00:00.000Z",
      endAt: "2026-08-01T10:30:00.000Z",
      title: "Lab 3: Thuật toán tìm kiếm A*",
    });
    expect(body.summary).toBe("Study: Lab 3: Thuật toán tìm kiếm A*");
    expect(body.start).toEqual({ dateTime: "2026-08-01T09:00:00.000Z" });
    expect(body.end).toEqual({ dateTime: "2026-08-01T10:30:00.000Z" });
  });

  it("tags the event with the originating session id", () => {
    const body = buildCalendarEventBody({
      id: "session-42",
      startAt: "2026-08-01T09:00:00.000Z",
      endAt: "2026-08-01T10:30:00.000Z",
      title: "Essay draft",
    });
    expect(body.extendedProperties.private.unipilotSessionId).toBe("session-42");
  });
});
