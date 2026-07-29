-- UniPilot AI — Phase 7 schema addition: why Gemini scheduled this session.
-- input_snapshot on study_plans captures the *inputs*, but not a per-session
-- rationale — this small nullable column lets the plan editor explain each
-- block without needing a second table.
-- See docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 7.

alter table study_sessions add column reason text;
