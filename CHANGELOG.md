# Changelog

All notable changes to caraoke are documented here.
This project follows the BMAD method (Analysis → Planning → Solutioning → Implementation).

## [0.2.0-foundation] — 2026-06-25

Foundation milestone — the buildable skeleton and the Phase 0 validation harness.
Code-complete for Stories 1.1–1.4; **the Phase 0 gate itself has not yet been run**
(the real two-phone road test + felt-together verdict is a pending human step).

### Added
- **Monorepo scaffold (Story 1.1):** pnpm + Turborepo workspace, Expo SDK 56 app,
  `packages/shared` (types/Zod) + `packages/config`, `services/api` stub, CI lint/type/test gate.
- **AWS infrastructure (Story 1.2):** Terraform for `ca-central-1`, **applied** — VPC/NAT,
  KMS, Aurora Serverless v2 (PostgreSQL 17.9, scales to zero), ElastiCache Redis, Cognito
  (user/admin RBAC), Secrets Manager (`caraoke-dev/{spotify,xai,stripe}`), ECS. Residency-enforced.
- **Phase 0 duet harness (Stories 1.3–1.4):** throwaway two-phone prototype — voice-only WebRTC,
  dual independent Spotify playback, clock-synced simultaneous start, plus drift/latency
  measurement and a GO/NO-GO report generator. Core math unit-tested (12/12 passing).

### Changed
- AWS Terraform provider pinned to `~> 6.51` (unlocks the real `aws_ecs_express_gateway_service`
  for later); `aws_region.name` → `.region` for the v6 migration.

### Fixed
- Corrected a non-existent dependency pin in the harness (`@config-plugins/react-native-webrtc`
  `^11.0.0` → `^15.0.0`), unblocking install and the dev-client build.

### Notes
- Implementation is **gated at Phase 0**: Ralph is parked at 4/48 stories; the full build
  (LiveKit/MCP deploys + Epics 2–8) resumes only after the road test confirms the duet feels real.

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

[0.2.0-foundation]: https://github.com/sdegrandpre-infonuagix-ai/caraoke/releases/tag/v0.2.0-foundation
[0.1.0-planning]: https://example.invalid/caraoke/releases/tag/v0.1.0-planning
