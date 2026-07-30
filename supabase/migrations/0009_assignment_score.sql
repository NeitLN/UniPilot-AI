-- F-03 (future_update.md): `weight` was a required field on every
-- assignment that was never used for anything beyond storage and the
-- Gemini planner prompt — no UI ever showed it, and nothing rolled it up
-- into a grade. Adding the score actually achieved on each assignment lets
-- weight finally do the job its name implies: weight × score, aggregated
-- per course, becomes a predicted course grade (see
-- lib/rules/gpa.ts predictedCourseScore).

alter table assignments
  add column score numeric(5,2) check (score is null or (score >= 0 and score <= 100));
