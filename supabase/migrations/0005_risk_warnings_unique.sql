-- UniPilot AI — Phase 8 hardening: computeAndStoreRisk runs concurrently
-- from the dashboard KPI, the RiskHud, and the /risk page in the same
-- render pass. Each independently checked "does a warning exist yet?" and,
-- seeing none, inserted one — a classic check-then-act race that produced
-- duplicate open warnings for the same risk_scores row.
-- See docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 8.

alter table risk_warnings
  add constraint risk_warnings_risk_score_unique unique (risk_score_id);
