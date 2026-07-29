export interface ClassBlockData {
  id: string;
  title: string;
  location: string | null;
  startAt: string;
  endAt: string;
  courseId: string | null;
  courseName: string | null;
  gcalEventId: string | null;
  isAllDay: boolean;
  notes: string | null;
  reminderMinutesBefore: number | null;
  recurrenceGroupId: string | null;
}

export interface AssignmentLink {
  id: string;
  title: string;
  dueAt: string;
}
