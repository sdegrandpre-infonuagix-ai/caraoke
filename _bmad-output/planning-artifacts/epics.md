---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-06-21'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# caraoke - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for caraoke, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Account, Profile & Localization**
- FR1: A user can create and manage a Caraoke account.
- FR2: A user can connect their Spotify Premium account, and the system verifies Premium status.
- FR3: A user can set a language preference from the 25 supported languages, stored on their profile.
- FR4: A user receives all Voice-Agent speech in their own profile language, independently of their partner's language.
- FR5: A user receives the full app UI in their own profile language.
- FR6: A user can delete their account and associated personal data.

**Session Pairing & Partner Management**
- FR7: A user can create a duet session and generate an invite (link or pairing code).
- FR8: A user can join a duet session via a valid invite link or pairing code.
- FR9: A user can save known partners and re-pair with a known partner in ≤10 seconds (intent to ready-handshake).
- FR10: The system confirms both partners are paired and ready before a song begins (ready-handshake).
- FR11: A user is notified (push) of incoming invitations, partner-ready status, and reconnection events.

**Voice-Agent Orchestration (hands-free)**
- FR12: A user can start and control a session entirely by voice via the xAI Voice Agent.
- FR13: A user can request a specific song by voice, and the agent initiates it for the session.
- FR14: The Voice Agent coordinates a simultaneous start of the song across both devices.
- FR15: The Voice Agent handles errors and interruptions by voice.
- FR16: The Voice Agent asks the post-session feedback question aloud and captures the spoken answer.
- FR17: All in-session user interactions are available eyes-free; screen taps only when stationary/out-of-session.

**Synchronized Playback**
- FR18: The system plays the same song independently on each device via each user's Spotify, started in lockstep.
- FR19: The system monitors backing-track drift between the two devices during playback.
- FR20: The system corrects or compensates for backing-track drift to keep the two streams aligned.
- FR21: A user can start, pause, and stop session playback (by voice), reflected on both devices.

**Live Voice Duet**
- FR22: The system captures each user's microphone input during a session, only after explicit consent.
- FR23: The system transmits each user's live voice to their partner in full duplex during the session.
- FR24: A user hears their partner's live voice layered over their own backing-track playback.
- FR25: The system automatically attempts to reconnect a dropped session within the continuity window and resyncs.
- FR26: The system ends a session gracefully (by voice) when reconnection is not possible.

**Nearby Discovery (opt-in)**
- FR27: A user can opt in to be discoverable to nearby users (off by default).
- FR28: A user can ask the Voice Agent to read out nearby discoverable users within their coarse surrounding area.
- FR29: A user is surfaced to others only by coarse area, never by precise location.
- FR30: A user can add a discovered nearby user as a partner.
- FR31: After a user is added, their location is never exposed to the adder again (no ongoing tracking).
- FR32: Nearby discovery is available only to age-verified adults (18+).

**Trust, Safety & Privacy**
- FR33: A user can mute, block, and report another user during or after a session.
- FR34: A user can rapidly disconnect from a session by voice command.
- FR35: A user can grant/deny mic, location, and notification permissions independently, with graceful degradation.
- FR36: A user can view and control how their voice, location, and profile data are handled.
- FR37: The system handles abuse reports for stranger voice interactions (reporting pipeline, repeat-offender handling).

**Billing & Payments (user-facing)**
- FR38: A user can manage a payment method and subscription via Stripe from a payment section in their profile.
- FR39: A user can view their plan, subscribe, upgrade/downgrade, and cancel.
- FR40: A user can view billing history and receipts.
- FR41: The system processes payments through Stripe such that raw card data is never stored by Caraoke (SAQ-A).

**Feedback & Telemetry**
- FR42: The system records the post-session "felt like singing together" response.
- FR43: The system captures session-health metrics (simultaneous-start accuracy, drift, voice latency, continuity, failures).

**Administration & Operations**
- FR44: An administrator can view dashboards of "felt together" rate, real-time-metric distributions, paired retention, active pairs, and Premium-funnel drop-off.
- FR45: An administrator can access a billing & payments admin console.
- FR46: An administrator can view and manage subscriptions, transactions, refunds, and failed/disputed payments.
- FR47: An administrator can view revenue and payment reporting (MRR, churn, failed-payment rate).
- FR48: An administrator can manage user accounts in support of billing and trust-&-safety actions.

### NonFunctional Requirements

- NFR1: Voice-agent simultaneous start triggers both Spotify streams within ≤200ms of each other.
- NFR2 (Provisional — Phase 0): Backing-track drift stays within ≤50ms, sustained across a full song.
- NFR3 (Provisional — Phase 0): One-way live-voice latency is ≤150ms under typical mobile/cellular conditions.
- NFR4: App UI and lyrics/feedback updates respond within ≤200ms of the triggering event.
- NFR5: Latency-critical media is served from the nearest available edge location, degrading to regional endpoints.
- NFR6: Encryption everywhere — TLS 1.2+ in transit, E2E (SRTP/DTLS) voice media, KMS at rest.
- NFR7: Card data handled exclusively by Stripe; PCI scope minimized to SAQ-A.
- NFR8: Singing/voice audio handled ephemerally; no voiceprints/biometric identity.
- NFR9: Discovery uses coarse area only; location never persisted as a trail, never exposed after add.
- NFR10: GDPR/CCPA + PIPEDA/Quebec Law 25 compliant; Canadian data residency by default.
- NFR11: Authenticated access enforced; admin console restricted; 18+ age gate for stranger discovery.
- NFR12: Sustain ≥50 concurrent paired sessions on MVP infrastructure, horizontally scalable.
- NFR13: Support 10× growth in active pairs with <10% degradation of real-time targets.
- NFR14: ≥90% of sessions keep voice + both backing tracks usable for a full song.
- NFR15: Auto-reconnect a dropped session within the continuity window (≤60s) and resync; fail gracefully.
- NFR16: Backend availability ≥99.5%; third-party outages degrade gracefully with voice messaging.
- NFR17: Eyes-free / hands-free by default — all in-session interaction operable by voice.
- NFR18: Visual UI targets WCAG 2.1 AA.
- NFR19: Full UI + agent speech localized across 25 languages (with RTL where applicable).
- NFR20: Each critical third party accessed behind an internal abstraction; tracked critical-path dependency.
- NFR21: Honor each provider's terms; no peer-to-peer re-streaming of Spotify audio; respect rate limits.

### Additional Requirements

**Starter & Foundation (Architecture):**
- AR1: Initialize Expo SDK 56 app + pnpm monorepo scaffold + `packages/shared` (shared types/Zod) + `packages/config`. **(Epic 1, Story 1)**
- AR2: Build and run the **Phase 0 validation harness** (`tools/phase0-harness/`) — measure drift + voice latency on Bell 5G, Montreal highway. **Go/no-go gate before the full build.**

**Infrastructure (Terraform, `ca-central-1`):**
- AR3: ECS Express Mode services (core API monolith + Spotify MCP server).
- AR4: AppSync Events (pub/sub handshake), Amazon Cognito (auth + RBAC groups).
- AR5: Aurora Serverless PostgreSQL 17.9 + Redis (ElastiCache).
- AR6: LiveKit self-hosted SFU (ca-central-1 → Bell Wavelength Zone when Phase 0 justifies).
- AR7: AWS Secrets Manager (xAI/Grok key via Lambda broker); Firehose→S3→Athena/QuickSight telemetry pipeline + CloudWatch metrics.
- AR8: CI/CD — GitHub Actions → ECR → ECS Express; EAS Build/Update for mobile.

**Cross-cutting (Architecture):**
- AR9: Integration abstractions with live + sandbox-mock per provider (Spotify, xAI, Stripe, Plus Codes, age-verify/Stripe Identity, APNs/FCM) — env-selected.
- AR10: Clock-sync primitive (server-time offset) enabling scheduled-start ("start at T"); drift-monitoring hooks over LiveKit data channel.
- AR11: Uniform `{data,error}` API envelope; Zod validation at all boundaries; versioned domain events; snake↔camel mapping in repositories only.
- AR12: Canadian data residency (Law 25) enforced; data-subject deletion paths (FR6).

### UX Design Requirements

- UX-DR1: NativeWind v4 setup + "Warm Dusk" design tokens (color palette, 8px spacing scale, type scale, radius scale) in `tailwind.config`.
- UX-DR2: `SessionStateMachine` — single source of truth for session lifecycle (idle→pairing→ready→playing→reconnecting→ended); visual + sonic layers subscribe.
- UX-DR3: Sonic services (native module + TS facades + typed event bridge): `SonicEngine` (cue library), `RiffVoice` (TTS), `AudioDucking` (−12dB/500ms + priority stack), `AmbientPresence` (black-screen alive texture).
- UX-DR4: Sonic verification harness (assert cue playback, ducking levels/curves, ambient-while-black, RiffVoice follow-up window).
- UX-DR5: `DrivingModeScreen` — motion-detected black screen (debounced accelerometer + GPS entry/exit); tap wakes Riff (voice), not UI.
- UX-DR6: `WaveformVisualizer` — UI-thread (Reanimated/Skia), throttled dual-voice activity feed; honors reduced-motion.
- UX-DR7: Foundation primitives — `Button` (4 variants), `Card`, `ScreenContainer` (safe-area + driving-mode aware), `Text`, `Avatar`, `Toggle`, `Icon`.
- UX-DR8: Feature components — `RiffButton`, `RiffStatus`, `SessionControls`, `PartnerBar`/`PartnerAvatar`, `CountdownOverlay`, `GateCard` (shared shell + per-gate bodies: mic/Premium/age/location), `SuggestionPrompt`, `RecentPartners`, `TabBar`, `DiscoveryList` (empty-state-aware), billing rows.
- UX-DR9: Voice interaction patterns — listen cue + 3–5s hot window, binary-only choices, confirm-by-restate, barge-in, failure ladder (re-ask→alternative→exit), concision.
- UX-DR10: Feedback patterns — sonic cue per state transition, voice-announced transitions, audio-ducking protocol.
- UX-DR11: Error/recovery patterns — voice-first, pre-loaded offline message, no modals while moving, never a dead-end.
- UX-DR12: Navigation — Expo Router; 3-tab bar (Home/Discover/Profile) stationary only; black screen replaces nav when moving.
- UX-DR13: Internationalization — 25-language UI + agent speech; externalized strings (expo-localization + i18n lib); RTL via logical `start`/`end` props from day one.
- UX-DR14: Accessibility — WCAG 2.1 AA; VoiceOver/TalkBack labels + roles on all stationary UI; reduced-motion; dynamic type; ≥48px targets; no color-only info.
- UX-DR15: Onboarding flow — Sign-in with Apple/Google (Cognito) → mic permission → language → Spotify Premium gate **with graceful recovery** (upgrade / remind-later).
- UX-DR16: Post-session "felt together?" sonic capture — RiffVoice asks during 2s afterglow; spoken answer captured; intentionally NO visual component.

### FR Coverage Map

- FR1–FR6: Epic 2 — Accounts, Profile & Localization
- FR7–FR11: Epic 3 — Pairing & Partner Connection
- FR12–FR17: Epic 4 — The Duet (voice-agent orchestration, eyes-free)
- FR18–FR21: Epic 4 — The Duet (synchronized playback + drift)
- FR22–FR26: Epic 4 — The Duet (live voice, reconnect/resync)
- FR27–FR32: Epic 5 — Nearby Discovery
- FR33–FR37: Epic 6 — Trust, Safety & Privacy
- FR38–FR41: Epic 7 — Billing & Subscriptions
- FR42: Epic 4 (capture) + Epic 8 (aggregation/dashboard)
- FR43: Epic 8 — Telemetry pipeline
- FR44–FR48: Epic 8 — Admin/Ops Console

## Epic List

### Epic 1: Foundation & the Magic Moment (Phase 0)
Scaffold the monorepo and base infrastructure, deploy the real-time media prerequisites (LiveKit SFU, Spotify MCP), then build and run the throwaway Phase 0 validation harness on a real Montreal highway to prove backing-track drift, voice latency, and the "felt together" feeling. This is the go/no-go gate before the full build.
**FRs covered:** none directly (enabler) — implements AR1, AR2, AR3 (MCP), AR6 (LiveKit); validates NFR2, NFR3.

### Epic 2: Accounts, Profile & Localization
Users sign in (Apple/Google via Cognito), link Spotify Premium, set their language (agent speech + UI, independently per user), and manage or delete their account. Establishes design tokens, foundation primitives, and the i18n foundation.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6.

### Epic 3: Pairing & Partner Connection
Users create/join invites, save and fast-re-pair known partners, complete the ready-handshake, and receive push notifications. Includes the clock-sync primitive groundwork needed for simultaneous start.
**FRs covered:** FR7, FR8, FR9, FR10, FR11.

### Epic 4: The Duet (real-time singing loop)
The product. Voice-Agent orchestration, simultaneous independent Spotify playback with drift correction, full-duplex live voice, auto-reconnect/resync, the eyes-free/driving-mode/sonic system, and the post-session "felt together?" capture.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR42 (capture).

### Epic 5: Nearby Discovery
Opt-in discoverability, coarse Plus-Code area read-out by Riff, age verification (Stripe Identity), and the add-then-go-dark privacy model.
**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32.

### Epic 6: Trust, Safety & Privacy
Mute/block/report, rapid voice-disconnect, user data controls, the abuse-handling pipeline, and independent permission management with graceful degradation.
**FRs covered:** FR33, FR34, FR35, FR36, FR37.

### Epic 7: Billing & Subscriptions
Stripe subscription management, payment method, plan changes, and billing history/receipts — the monetization rail (SAQ-A).
**FRs covered:** FR38, FR39, FR40, FR41.

### Epic 8: Telemetry & Admin/Ops Console
Session-health + "felt-together" telemetry pipeline, and the admin web console for dashboards, billing operations, account/T&S management, and revenue reporting.
**FRs covered:** FR43, FR44, FR45, FR46, FR47, FR48, FR42 (aggregation).

---

## Epic 1: Foundation & the Magic Moment (Phase 0)

Scaffold the monorepo and base infra, then prove the duet *feels* real on a Montreal highway before committing to the full build.

### Story 1.1: Monorepo & Expo app scaffold

As a developer,
I want the pnpm monorepo, Expo SDK 56 app, and shared packages initialized with a CI gate,
So that all subsequent work has a consistent, type-safe foundation.

**Acceptance Criteria:**

**Given** an empty repo
**When** the scaffold story is complete
**Then** `apps/mobile` (Expo SDK 56), `services/api`, `packages/shared`, `packages/config` exist in a pnpm workspace
**And** TypeScript `strict`, shared ESLint/Prettier, and a CI workflow blocking on lint/type/test are configured
**And** `pnpm dev` and `pnpm build` run successfully across the workspace.

### Story 1.2: Base AWS infrastructure skeleton (Terraform)

As a developer,
I want a minimal Terraform-defined infrastructure baseline in `ca-central-1`,
So that later epics can deploy services into a residency-compliant environment.

**Acceptance Criteria:**

**Given** AWS credentials and the `infra/` Terraform modules
**When** `terraform apply` runs for the `dev` env
**Then** a VPC, ECS Express service placeholder, Aurora Serverless (PostgreSQL 17.9), Redis, Cognito user pool, and Secrets Manager are provisioned in `ca-central-1`
**And** all data stores are KMS-encrypted at rest (NFR6)
**And** no resources are provisioned outside Canada (NFR10).

### Story 1.3: Phase 0 duet harness (manual two-phone prototype)

As a founder,
I want a throwaway two-phone harness with manual simultaneous start, WebRTC voice, and dual independent Spotify playback,
So that I can experience and measure a real duet without the full stack.

**Acceptance Criteria:**

**Given** two phones on cellular with Spotify Premium
**When** the operator triggers a manual countdown start
**Then** both phones begin the same track and open a full-duplex WebRTC voice channel
**And** the song audio is never transmitted peer-to-peer (only voice) (NFR21)
**And** the harness lives in `tools/phase0-harness/` and is clearly marked throwaway.

### Story 1.4: Phase 0 measurement & go/no-go report

As a founder,
I want the harness to measure backing-track drift and one-way voice latency and capture a "felt together?" answer,
So that I have evidence to decide whether to build the full product.

**Acceptance Criteria:**

**Given** a harness session on Bell 5G on a Montreal highway
**When** a full song completes
**Then** drift (position vs wallclock) and one-way voice latency are sampled and logged to `results/`
**And** a spoken "did that feel like singing together?" answer is recorded
**And** a summary report states measured drift vs ≤50ms (NFR2), latency vs ≤150ms (NFR3), and a go/no-go recommendation.

### Story 1.5: Deploy self-hosted LiveKit SFU

As a developer,
I want the self-hosted LiveKit SFU deployed in `ca-central-1`,
So that the live-voice plane (Epic 4) has a residency-compliant media server to connect to.

**Acceptance Criteria:**

**Given** the Terraform infra baseline (Story 1.2)
**When** the LiveKit module is applied
**Then** a self-hosted LiveKit SFU runs in `ca-central-1`, backed by the existing Redis for distributed state (AR6, NFR10)
**And** it is reachable via the integration abstraction with health checks and a documented path to relocate to the Bell Wavelength Zone when Phase 0 justifies (NFR5)
**And** voice media is encrypted end-to-end (SRTP/DTLS) (NFR6)
**And** this production SFU is independent of the throwaway WebRTC used in the Phase 0 harness (Story 1.3).

### Story 1.6: Deploy Spotify MCP server

As a developer,
I want the Spotify MCP server deployed on ECS Express Mode,
So that the Voice Agent (Epic 4) can trigger Spotify playback via MCP tool calls.

**Acceptance Criteria:**

**Given** the Terraform infra baseline (Story 1.2)
**When** the `services/spotify-mcp` server is built and deployed
**Then** it runs on ECS Express Mode in `ca-central-1` with `streamable-http` transport (AR3)
**And** it exposes the MCP tools needed to control playback, behind the Spotify integration abstraction with a sandbox mock available (NFR20, AR9)
**And** Spotify credentials are sourced from Secrets Manager, never hard-coded
**And** it honors Spotify provider terms — no peer-to-peer re-streaming of audio (NFR21).

---

## Epic 2: Accounts, Profile & Localization

Users onboard, link Premium, set language, and control their account.

### Story 2.1: Design tokens & foundation primitives

As a developer,
I want NativeWind configured with the "Warm Dusk" tokens and the foundation primitive components,
So that all screens are built consistently and accessibly.

**Acceptance Criteria:**

**Given** the mobile app
**When** primitives are implemented
**Then** `tailwind.config` defines the Warm Dusk palette, 8px spacing scale, type scale, and radius scale (UX-DR1)
**And** `Button` (4 variants), `Card`, `ScreenContainer`, `Text`, `Avatar`, `Toggle`, `Icon` exist (UX-DR7)
**And** every interactive primitive has `accessibilityLabel`/role, ≥48px targets, and uses logical `start`/`end` props (UX-DR14).

### Story 2.2: Sign in with Apple/Google (Cognito)

As a new user,
I want to sign in with Apple or Google,
So that I can create my Caraoke account in one tap.

**Acceptance Criteria:**

**Given** the onboarding screen
**When** I choose Apple or Google sign-in
**Then** Cognito authenticates me and a `users` record is created (FR1)
**And** a valid session (JWT) is issued and stored securely
**And** returning sign-in reuses the existing account.

### Story 2.3: Profile management & account deletion

As a user,
I want to view/edit my profile and delete my account and data,
So that I control my presence and satisfy my privacy rights.

**Acceptance Criteria:**

**Given** an authenticated user
**When** I edit profile fields and save
**Then** changes persist via the uniform `{data,error}` API (FR1)
**And** when I request account deletion, my account and all associated personal data are removed via cascading deletion (FR6, NFR10)
**And** deletion is confirmed and irreversible.

### Story 2.4: Connect & verify Spotify Premium

As a user,
I want to connect my Spotify account and have Premium verified,
So that the system knows I can participate in duets.

**Acceptance Criteria:**

**Given** an authenticated user on the Spotify link screen
**When** I complete Spotify OAuth
**Then** the link is stored and Premium status is verified via the Spotify integration (FR2)
**And** a non-Premium account is told plainly and offered an upgrade path (not silently accepted)
**And** the Spotify provider is accessed only via its abstraction with a sandbox mock available (NFR20, AR9).

### Story 2.5: Language preference & i18n foundation

As a user,
I want to set my language and have the app and agent speak it,
So that Caraoke works in my own tongue regardless of my partner's.

**Acceptance Criteria:**

**Given** onboarding or profile settings
**When** I select one of 25 supported languages (defaulting to device locale)
**Then** the full UI renders in that language with externalized strings (FR3, FR5, NFR19)
**And** the Voice Agent's speech language is set to my preference, independent of my partner (FR4)
**And** RTL languages mirror layout via logical props (UX-DR13).

---

## Epic 3: Pairing & Partner Connection

Two users connect and reach the ready state, hands-free-ready.

### Story 3.1: Create session & generate invite

As a user,
I want to create a duet session and get an invite link or code,
So that I can ask someone to sing with me.

**Acceptance Criteria:**

**Given** an authenticated user
**When** I create a session
**Then** a `sessions` record is created and a valid invite link and pairing code are returned (FR7)
**And** the invite encodes the session and expires after a defined window.

### Story 3.2: Join session via invite

As an invited user,
I want to join a session via link or code,
So that I can connect with the person who invited me.

**Acceptance Criteria:**

**Given** a valid, unexpired invite
**When** I open the link or enter the code
**Then** I am joined to the session and both partners are shown as connected (FR8)
**And** an invalid or expired invite returns a clear `{error}` and a recovery path.

### Story 3.3: Save partners & fast re-pair

As a returning user,
I want to save known partners and re-pair quickly,
So that singing again is effortless.

**Acceptance Criteria:**

**Given** a completed session with a partner
**When** I save them as a known partner
**Then** a `saved_partners` record links us (FR9)
**And** re-pairing with a saved partner completes from intent to ready-handshake in ≤10 seconds (FR9).

### Story 3.4: Ready-handshake

As a user,
I want both partners confirmed ready before the song starts,
So that there are no false starts.

**Acceptance Criteria:**

**Given** two paired users
**When** both indicate readiness
**Then** the system confirms a ready state to both via AppSync Events before any countdown (FR10)
**And** the `SessionStateMachine` transitions `pairing → ready` and is the single source of truth (UX-DR2).

### Story 3.5: Push notifications (invites, ready, reconnect)

As a user,
I want push notifications for invitations, partner-ready, and reconnection events,
So that I never miss a fleeting moment.

**Acceptance Criteria:**

**Given** a user with notifications granted
**When** an invite, partner-ready, or reconnection event occurs
**Then** a push notification is delivered via APNs/FCM in the user's language (FR11, NFR19)
**And** the push deep-links to the relevant session.

### Story 3.6: Clock-sync primitive

As a developer,
I want a server-time offset primitive on each client,
So that simultaneous start can be scheduled accurately.

**Acceptance Criteria:**

**Given** a client establishing a session
**When** it performs the clock-sync exchange
**Then** it computes a server-time offset accurate enough to support a ≤200ms scheduled start (AR10, NFR1)
**And** the offset is refreshed periodically and exposed to the playback layer.

---

## Epic 4: The Duet (real-time singing loop)

The product: two people sing together, hands-free, across distance.

### Story 4.1: Native audio module & LiveKit live voice

As a singer,
I want my microphone captured (after consent) and my partner's live voice in full duplex,
So that we hear each other while we sing.

**Acceptance Criteria:**

**Given** explicit microphone consent (FR22)
**When** a session's voice plane opens
**Then** the native audio module captures my mic and transmits full-duplex voice via the LiveKit SFU (FR23)
**And** I hear my partner's live voice layered over my own playback (FR24)
**And** voice media is encrypted end-to-end (SRTP/DTLS) (NFR6).

### Story 4.2: SessionStateMachine & sonic services

As a developer,
I want the session state machine and the sonic services in place,
So that visual and audio feedback stay consistent and the eyes-free experience works.

**Acceptance Criteria:**

**Given** the mobile app and native audio module
**When** sonic services are implemented
**Then** `SonicEngine`, `RiffVoice`, `AudioDucking`, and `AmbientPresence` exist as native-backed services with TS facades + event bridge (UX-DR3)
**And** ducking lowers the backing track ~12dB / partner ~6dB with 500ms restore and honors the priority stack (UX-DR10)
**And** both visual and sonic layers subscribe to the `SessionStateMachine` (UX-DR2).

### Story 4.3: Voice-Agent intent & song request

As a user,
I want to start a session and request a song entirely by voice,
So that I never touch the screen while driving.

**Acceptance Criteria:**

**Given** an active or pairing session
**When** I say "sing [song] with [partner]"
**Then** the xAI Voice Agent interprets the intent and confirms by restating it (FR12, FR13, UX-DR9)
**And** the agent initiates the requested song for the session via the Spotify MCP
**And** the agent uses binary-only choices and a failure ladder on misrecognition (UX-DR9).

### Story 4.4: Simultaneous scheduled start

As a pair of singers,
I want both phones to start the same song in lockstep,
So that it feels like one shared performance.

**Acceptance Criteria:**

**Given** a ready handshake and clock-sync offset
**When** the agent triggers start
**Then** both devices pre-buffer the track paused and unpause at the same absolute timestamp T (FR14, FR18)
**And** the two starts occur within ≤200ms of each other (NFR1)
**And** the song plays independently from each user's own Spotify (no re-streaming) (NFR21).

### Story 4.5: Drift monitoring & correction

As a singer,
I want the two backing tracks kept in sync invisibly,
So that we stay rhythmically together.

**Acceptance Criteria:**

**Given** an active duet
**When** playback positions are reported over the LiveKit data channel
**Then** the system detects drift between the two streams (FR19)
**And** corrects via micro-seek/nudge on the lagging device, targeting ≤50ms (FR20, NFR2)
**And** correction is imperceptible — no user-facing metric or interruption.

### Story 4.6: Voice playback controls

As a user,
I want to start, pause, and stop playback by voice,
So that I control the session hands-free.

**Acceptance Criteria:**

**Given** an active session
**When** I say pause/stop/resume
**Then** the action applies and is reflected on both devices (FR21)
**And** all controls are operable eyes-free (FR17).

### Story 4.7: Eyes-free driving mode & session screen

As a driver,
I want the screen to go black when moving and Riff to be the only interface,
So that I never look away from the road.

**Acceptance Criteria:**

**Given** the device detects sustained vehicle motion
**When** driving mode activates
**Then** `DrivingModeScreen` renders a true-black screen with ambient presence and a tap wakes Riff (voice, not UI) (FR17, UX-DR5)
**And** when stationary, the `WaveformVisualizer` (UI-thread) and `SessionControls` render (UX-DR6, UX-DR12)
**And** motion entry/exit is debounced to avoid red-light flicker.

### Story 4.8: Voice-first errors, reconnect & resync

As a driver,
I want dropped connections handled calmly by voice with automatic recovery,
So that a glitch feels like a pause, not a crash.

**Acceptance Criteria:**

**Given** an active duet
**When** the connection drops
**Then** Riff announces it by voice and auto-reconnects within the continuity window (≤60s), resyncing on recovery (FR15, FR25, NFR15)
**And** if reconnection fails, the agent ends the session gracefully by voice with a warm next step (FR26)
**And** no modal or screen interaction is required while moving (UX-DR11).

### Story 4.9: Post-session "felt together?" capture

As a user,
I want Riff to ask how it felt and capture my spoken answer,
So that the product's truest metric is measured without a survey.

**Acceptance Criteria:**

**Given** a song has just ended
**When** the 2-second afterglow passes
**Then** `RiffVoice` asks "did that feel like singing together?" and the native module captures the spoken answer (FR16, FR42, UX-DR16)
**And** there is no visual component for this capture
**And** the response is stored for telemetry.

### Story 4.10: Sonic verification harness

As a developer,
I want automated assertions for the sonic layer,
So that the primary interface is verified, not shipped on vibes.

**Acceptance Criteria:**

**Given** the sonic services
**When** the harness runs
**Then** it asserts cue playback per state, ducking levels/curves (−12dB/500ms), ambient-presence-while-black, and the RiffVoice follow-up window (UX-DR4)
**And** it runs in CI alongside the unit suite.

---

## Epic 5: Nearby Discovery

Spontaneous duets with nearby strangers — safe by construction.

### Story 5.1: Opt-in discoverability toggle

As a user,
I want discovery off by default and an explicit opt-in,
So that I am never exposed without choosing to be.

**Acceptance Criteria:**

**Given** a user in Discover settings
**When** I view discovery
**Then** discoverability is off by default (FR27)
**And** enabling it requires an explicit toggle with a Riff-voiced rationale.

### Story 5.2: Age verification (18+) via Stripe Identity

As the platform,
I want stranger discovery gated to verified adults,
So that minors are not exposed to stranger voice interaction.

**Acceptance Criteria:**

**Given** a user enabling discovery for the first time
**When** the age gate triggers
**Then** a one-time age verification runs via the age-verification abstraction (Stripe Identity) (FR32, NFR11)
**And** only an `is18Plus` result + verification reference is stored — never the ID document
**And** under-18/failed verification blocks discovery with a warm explanation.

### Story 5.3: Coarse-location publishing (Plus Codes)

As a discoverable user,
I want to be surfaced only by coarse area,
So that my precise location is never exposed.

**Acceptance Criteria:**

**Given** an opted-in, age-verified user with coarse location granted
**When** discovery is active
**Then** only a coarse Google Plus-Code area is published to a TTL entry in Redis (FR29, NFR9)
**And** precise coordinates are never stored or transmitted
**And** the entry expires automatically (no trail).

### Story 5.4: Voice read-out of nearby singers

As a driver,
I want to ask Riff who's nearby,
So that I can find a duet partner hands-free.

**Acceptance Criteria:**

**Given** an opted-in user while driving
**When** I ask "any Caraokes nearby?"
**Then** Riff reads out opted-in users within my coarse area by name (FR28)
**And** an empty pool is handled warmly, never "0 found" (UX-DR8)
**And** only coarse-area matches are surfaced (FR29).

### Story 5.5: Add nearby partner & go-dark

As a user,
I want to add a nearby singer and have their location then disappear,
So that discovery can't become tracking.

**Acceptance Criteria:**

**Given** a nearby user surfaced to me
**When** I add them as a partner
**Then** they become a saved partner (FR30)
**And** their location is never exposed to me again — no ongoing tracking (FR31)
**And** the add is a one-shot, ephemeral handshake.

---

## Epic 6: Trust, Safety & Privacy

Users are safe, in control, and protected.

### Story 6.1: Mute, block & report

As a user,
I want to mute, block, and report another user,
So that I can protect myself during or after a session.

**Acceptance Criteria:**

**Given** an in-progress or past session
**When** I mute, block, or report a user
**Then** mute silences their voice immediately, block prevents future pairing, and report files a record (FR33)
**And** these actions are reachable by a single voice command in-session.

### Story 6.2: Rapid voice-disconnect

As a user,
I want to leave an uncomfortable session instantly by voice,
So that I'm never trapped.

**Acceptance Criteria:**

**Given** an active session
**When** I issue the disconnect voice command
**Then** the session ends immediately for me (FR34)
**And** it is the fastest action available, requiring no screen interaction.

### Story 6.3: Independent permission management

As a user,
I want to grant/deny mic, location, and notifications independently,
So that I share only what I'm comfortable with.

**Acceptance Criteria:**

**Given** the app
**When** I manage permissions
**Then** mic, location, and notifications are requested just-in-time and independently (FR35)
**And** denying optional permissions degrades gracefully (mic is the only hard requirement).

### Story 6.4: Data controls & transparency

As a user,
I want to see and control how my voice, location, and profile data are handled,
So that I can exercise my privacy rights.

**Acceptance Criteria:**

**Given** privacy settings
**When** I view data handling
**Then** I see consent status, retention, and processors, and can export/delete my data (FR36, NFR10)
**And** voice is shown as ephemeral with no biometric/voiceprint storage (NFR8).

### Story 6.5: Abuse-handling pipeline

As an operator,
I want reported stranger-voice abuse handled systematically,
So that repeat offenders are managed.

**Acceptance Criteria:**

**Given** submitted reports
**When** the pipeline processes them
**Then** reports are queued with context for review and repeat-offender thresholds trigger escalation (FR37)
**And** resolution actions are auditable.

---

## Epic 7: Billing & Subscriptions

The monetization rail — pay to sing.

### Story 7.1: Stripe subscription & payment method

As a user,
I want to add a payment method and start a subscription via Stripe,
So that I can pay for Caraoke.

**Acceptance Criteria:**

**Given** an authenticated user in the billing section
**When** I add a payment method and subscribe
**Then** Stripe handles all cardholder data and Caraoke stores none (FR38, FR41, NFR7)
**And** my subscription status is recorded and gates paid features.

### Story 7.2: Plan management

As a subscriber,
I want to view, upgrade, downgrade, and cancel my plan,
So that I control my spending.

**Acceptance Criteria:**

**Given** an active subscription
**When** I change or cancel my plan
**Then** the change is applied via Stripe and reflected in my account (FR39)
**And** cancellation stops future billing at period end.

### Story 7.3: Billing history & receipts

As a subscriber,
I want to see my billing history and receipts,
So that I have records of payment.

**Acceptance Criteria:**

**Given** past transactions
**When** I open billing history
**Then** I see itemized charges and downloadable receipts (FR40).

### Story 7.4: Stripe webhook handling

As the system,
I want to process Stripe webhooks,
So that subscription state stays accurate.

**Acceptance Criteria:**

**Given** Stripe billing events
**When** a webhook is received by the `stripe-webhooks` Lambda
**Then** it is signature-verified and idempotently applied to subscription state (AR9)
**And** failed/disputed payments update the user's status.

---

## Epic 8: Telemetry & Admin/Ops Console

Run the venture on real numbers.

### Story 8.1: Session-health telemetry pipeline

As an operator,
I want session-health metrics captured to an analytics store,
So that I can monitor the product's real-time health.

**Acceptance Criteria:**

**Given** active sessions
**When** events are emitted
**Then** simultaneous-start accuracy, drift, voice latency, continuity, and failures flow via Firehose → S3 → Athena (FR43, AR7)
**And** live metrics publish to CloudWatch with alarms on p95 breaches
**And** no PII/voice/precise-location is included in telemetry (NFR6/8/9).

### Story 8.2: "Felt-together" aggregation

As an operator,
I want the "felt together?" responses aggregated,
So that I can track the product's truest health metric.

**Acceptance Criteria:**

**Given** captured feedback responses (FR42 capture)
**When** aggregation runs
**Then** the felt-together rate is computed over sessions and time windows (FR42 aggregation)
**And** it is queryable for the admin dashboard.

### Story 8.3: Admin console auth & shell

As founder/Maria,
I want a secure admin web console,
So that only authorized operators access ops tools.

**Acceptance Criteria:**

**Given** the `apps/admin` web app
**When** I sign in
**Then** access is restricted to the `admin` Cognito group via RBAC (NFR11)
**And** the console shell provides navigation to dashboards, billing, and accounts.

### Story 8.4: Metrics dashboards

As founder/Maria,
I want dashboards of the venture's key metrics,
So that I make decisions on data, not vibes.

**Acceptance Criteria:**

**Given** the telemetry pipeline and aggregations
**When** I open the dashboard
**Then** I see felt-together rate, simultaneous-start/drift/voice-latency distributions, paired 4-week retention, active pairs, and Premium-funnel drop-off (FR44)
**And** data is filterable by time range.

### Story 8.5: Billing administration

As founder/Maria,
I want to manage subscriptions, refunds, and disputes,
So that I can run billing operations.

**Acceptance Criteria:**

**Given** the admin billing console
**When** I view a customer
**Then** I can see and manage subscriptions, transactions, refunds, and failed/disputed payments (FR45, FR46)
**And** actions are logged.

### Story 8.6: Revenue reporting

As founder/Maria,
I want revenue and payment reporting,
So that I can track the path to two salaries.

**Acceptance Criteria:**

**Given** billing data
**When** I open revenue reporting
**Then** I see MRR, churn, and failed-payment rate (FR47)
**And** figures reconcile with Stripe.

### Story 8.7: User account administration

As founder/Maria,
I want to manage user accounts for billing and safety actions,
So that I can resolve issues and enforce policy.

**Acceptance Criteria:**

**Given** the admin console
**When** I act on a user account
**Then** I can suspend, reinstate, and resolve disputes in support of billing and trust-&-safety (FR48)
**And** every action is auditable.
