# Changelog

All notable changes to caraoke are documented here.
This project follows the BMAD method (Analysis → Planning → Solutioning → Implementation).

## [0.1.0-planning] — 2026-06-21

Planning milestone — all pre-implementation artifacts complete, validated, and aligned.
No application code yet; this release captures the validated plan of record.

### Product
- **PRD** validated (BMAD validate-prd: PASS, 4.5/5). 48 functional + 21 non-functional requirements.
  Voice-only-sync model; Montreal launch; PIPEDA / Quebec Law 25 + Canadian data residency (NFR10).
- **UX Design Specification** complete (14/14 steps). Riff-as-interface, motion-triggered black-screen
  driving mode, "The Wave" session screen + "Voice Hub" home, a first-class sonic design system,
  WCAG 2.1 AA. Four user-journey flows incl. Premium-gate recovery and mid-drive failure.

### Architecture
- **Architecture Decision Document** complete. Expo SDK 56 + native audio module; Express modular
  monolith on AWS ECS Express Mode; AppSync Events (scheduled-start); Cognito; Aurora PostgreSQL 17.9
  + Redis; **LiveKit self-hosted SFU** (`ca-central-1` → Bell Wavelength); Stripe (SAQ-A); uniform
  `{data,error}` API conventions; Terraform IaC; sandbox-mock per integration.

### Delivery plan
- **Epics & Stories** — 8 epics, 48 stories with Given/When/Then acceptance criteria.
  Phase 0 validation harness as the go/no-go gate (Stories 1.3–1.4); prerequisite deploy stories
  for LiveKit SFU (1.5) and Spotify MCP (1.6).
- **Implementation Readiness** — assessed READY. FR coverage 100% (48/48); strong
  PRD ⇄ UX ⇄ Architecture ⇄ Stories alignment; all major findings resolved; no open blockers.

### Notes
- Legacy root docs (`PRD.md`, `USER_STORIES.md`, `ARCHITECTURE.md`) are **deprecated** — superseded
  by the artifacts under `_bmad-output/planning-artifacts/`.

[0.1.0-planning]: https://example.invalid/caraoke/releases/tag/v0.1.0-planning
