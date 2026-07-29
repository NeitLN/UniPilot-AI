-- UniPilot AI — Phase 5 hardening: prevent a duplicate focus_sessions row
-- when the same in-flight session (persisted in localStorage) is completed
-- from two open tabs. Two genuine sessions starting at the exact same
-- millisecond for one user is not a real case worth allowing.
-- See docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 5.

alter table focus_sessions
  add constraint focus_sessions_user_started_unique unique (user_id, started_at);
