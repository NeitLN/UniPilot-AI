import { describe, expect, it } from "vitest";
import { mapGoogleEventToClassBlock } from "@/lib/calendar/map";

const userId = "user-1";
const syncedAt = new Date("2026-07-29T12:00:00.000Z");

describe("mapGoogleEventToClassBlock", () => {
  it("maps a timed event", () => {
    const row = mapGoogleEventToClassBlock(
      {
        id: "evt-1",
        summary: "Web Programming",
        location: "Room 402",
        start: { dateTime: "2026-07-30T07:00:00+07:00" },
        end: { dateTime: "2026-07-30T09:00:00+07:00" },
      },
      userId,
      syncedAt,
    );

    expect(row).toEqual({
      user_id: userId,
      gcal_event_id: "evt-1",
      title: "Web Programming",
      location: "Room 402",
      start_at: new Date("2026-07-30T07:00:00+07:00").toISOString(),
      end_at: new Date("2026-07-30T09:00:00+07:00").toISOString(),
      synced_at: syncedAt.toISOString(),
    });
  });

  it("falls back to a placeholder title and null location", () => {
    const row = mapGoogleEventToClassBlock(
      {
        id: "evt-2",
        start: { dateTime: "2026-07-30T07:00:00Z" },
        end: { dateTime: "2026-07-30T09:00:00Z" },
      },
      userId,
      syncedAt,
    );

    expect(row?.title).toBe("Untitled event");
    expect(row?.location).toBeNull();
  });

  it("maps an all-day event to midnight UTC boundaries", () => {
    const row = mapGoogleEventToClassBlock(
      {
        id: "evt-3",
        summary: "Midterm week",
        start: { date: "2026-08-01" },
        end: { date: "2026-08-02" },
      },
      userId,
      syncedAt,
    );

    expect(row?.start_at).toBe("2026-08-01T00:00:00.000Z");
    expect(row?.end_at).toBe("2026-08-02T00:00:00.000Z");
  });

  it("returns null for cancelled events", () => {
    const row = mapGoogleEventToClassBlock(
      {
        id: "evt-4",
        status: "cancelled",
        start: { dateTime: "2026-07-30T07:00:00Z" },
        end: { dateTime: "2026-07-30T09:00:00Z" },
      },
      userId,
      syncedAt,
    );
    expect(row).toBeNull();
  });

  it("returns null when start or end is missing", () => {
    const row = mapGoogleEventToClassBlock({ id: "evt-5", summary: "No time" }, userId, syncedAt);
    expect(row).toBeNull();
  });

  it("never includes course_id, so an upsert can't clobber a manual link", () => {
    const row = mapGoogleEventToClassBlock(
      {
        id: "evt-6",
        start: { dateTime: "2026-07-30T07:00:00Z" },
        end: { dateTime: "2026-07-30T09:00:00Z" },
      },
      userId,
      syncedAt,
    );
    expect(row).not.toHaveProperty("course_id");
  });
});
